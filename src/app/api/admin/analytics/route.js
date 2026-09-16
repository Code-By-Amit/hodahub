import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { pageViews, orders } from '@/lib/db/schema';
import { gte, lte, and, sql, ne, countDistinct, count } from 'drizzle-orm';

export async function GET(req) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Active Users Right Now (distinct visitorId in page_views in last 5 minutes)
    const activeUsersRes = await db
      .select({
        activeNow: countDistinct(pageViews.visitorId),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, fiveMinutesAgo));

    const activeNow = Number(activeUsersRes[0]?.activeNow || 0);

    // 2. Current 30 days unique visitors and total pageviews
    const currentStatsRes = await db
      .select({
        uniqueVisitors: countDistinct(pageViews.visitorId),
        totalViews: count(pageViews.id),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo));

    const currentUniqueVisitors = Number(currentStatsRes[0]?.uniqueVisitors || 0);
    const currentTotalViews = Number(currentStatsRes[0]?.totalViews || 0);

    // 3. Previous 30 days (day 31 to day 60) for comparison
    const prevStatsRes = await db
      .select({
        uniqueVisitors: countDistinct(pageViews.visitorId),
        totalViews: count(pageViews.id),
      })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, sixtyDaysAgo), lte(pageViews.createdAt, thirtyDaysAgo)));

    const prevUniqueVisitors = Number(prevStatsRes[0]?.uniqueVisitors || 0);
    const prevTotalViews = Number(prevStatsRes[0]?.totalViews || 0);

    // Calc % changes for traffic
    const uniqueVisitorsChangePct = prevUniqueVisitors > 0
      ? Math.round(((currentUniqueVisitors - prevUniqueVisitors) / prevUniqueVisitors) * 100)
      : currentUniqueVisitors > 0 ? 100 : 0;

    const pageViewsChangePct = prevTotalViews > 0
      ? Math.round(((currentTotalViews - prevTotalViews) / prevTotalViews) * 100)
      : currentTotalViews > 0 ? 100 : 0;

    // 4. Current 30 days Orders & Paid Revenue
    const currentOrderRes = await db
      .select({
        totalOrders: count(orders.id),
        totalRevenue: sql`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount}::numeric ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, thirtyDaysAgo), ne(orders.status, 'cancelled')));

    const currentTotalOrders = Number(currentOrderRes[0]?.totalOrders || 0);
    const currentTotalRevenue = Number(currentOrderRes[0]?.totalRevenue || 0);

    // 5. Previous 30 days Orders & Paid Revenue for comparison
    const prevOrderRes = await db
      .select({
        totalOrders: count(orders.id),
        totalRevenue: sql`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount}::numeric ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, sixtyDaysAgo),
          lte(orders.createdAt, thirtyDaysAgo),
          ne(orders.status, 'cancelled')
        )
      );

    const prevTotalOrders = Number(prevOrderRes[0]?.totalOrders || 0);
    const prevTotalRevenue = Number(prevOrderRes[0]?.totalRevenue || 0);

    const ordersChangePct = prevTotalOrders > 0
      ? Math.round(((currentTotalOrders - prevTotalOrders) / prevTotalOrders) * 100)
      : currentTotalOrders > 0 ? 100 : 0;

    const revenueChangePct = prevTotalRevenue > 0
      ? Math.round(((currentTotalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100)
      : currentTotalRevenue > 0 ? 100 : 0;

    // 6. Daily traffic breakdown for charts (last 30 days grouped by date)
    const dailyData = await db
      .select({
        date: sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`,
        uniqueVisitors: countDistinct(pageViews.visitorId),
        pageViews: count(pageViews.id),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo))
      .groupBy(sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`);

    // 7. Daily sales breakdown for charts (last 30 days grouped by date)
    const dailySales = await db
      .select({
        date: sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM-DD')`,
        ordersCount: count(orders.id),
        revenue: sql`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount}::numeric ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, thirtyDaysAgo), ne(orders.status, 'cancelled')))
      .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM-DD')`);

    // Fill missing dates in last 30 days for both traffic and sales charts
    const dailyMap = new Map(dailyData.map((d) => [d.date, d]));
    const salesMap = new Map(dailySales.map((s) => [s.date, s]));

    const chartData = [];
    const salesChartData = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const monthDayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const foundTraffic = dailyMap.get(dateStr);
      chartData.push({
        date: monthDayStr,
        fullDate: dateStr,
        visitors: Number(foundTraffic?.uniqueVisitors || 0),
        views: Number(foundTraffic?.pageViews || 0),
      });

      const foundSales = salesMap.get(dateStr);
      salesChartData.push({
        date: monthDayStr,
        fullDate: dateStr,
        orders: Number(foundSales?.ordersCount || 0),
        revenue: Number(Number(foundSales?.revenue || 0).toFixed(2)),
      });
    }

    // 8. 24-Hour Hourly Traffic Spikes (last 24 hours in 12-hour AM/PM format)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourlyData = await db
      .select({
        hour24: sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD HH24:00')`,
        uniqueVisitors: countDistinct(pageViews.visitorId),
        pageViews: count(pageViews.id),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, twentyFourHoursAgo))
      .groupBy(sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD HH24:00')`);

    const hourlyMap = new Map(hourlyData.map((h) => [h.hour24, h]));
    const hourlyChartData = [];
    let peakSpike = { label: 'None', views: 0 };

    for (let i = 23; i >= 0; i--) {
      const hDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      const isoYear = hDate.getFullYear();
      const isoMonth = String(hDate.getMonth() + 1).padStart(2, '0');
      const isoDay = String(hDate.getDate()).padStart(2, '0');
      const isoHour = String(hDate.getHours()).padStart(2, '0');
      const mapKey = `${isoYear}-${isoMonth}-${isoDay} ${isoHour}:00`;

      // 12-hour AM/PM formatting
      let h12 = hDate.getHours();
      const ampm = h12 >= 12 ? 'PM' : 'AM';
      h12 = h12 % 12 || 12;
      const displayTime12 = `${h12}:00 ${ampm}`;

      const found = hourlyMap.get(mapKey);
      const viewsCount = Number(found?.pageViews || 0);
      const visitorsCount = Number(found?.uniqueVisitors || 0);

      if (viewsCount > peakSpike.views) {
        peakSpike = { label: displayTime12, views: viewsCount };
      }

      hourlyChartData.push({
        time: displayTime12,
        visitors: visitorsCount,
        views: viewsCount,
      });
    }

    // 9. Top 5 pages
    const topPagesRes = await db
      .select({
        path: pageViews.path,
        views: count(pageViews.id),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo))
      .groupBy(pageViews.path)
      .orderBy(sql`count(${pageViews.id}) DESC`)
      .limit(5);

    // 9. Real Average Session Duration per distinct visitor (MAX - MIN timestamp per visitorId)
    const sessionRes = await db
      .select({
        durationSec: sql`EXTRACT(EPOCH FROM (MAX(${pageViews.createdAt}) - MIN(${pageViews.createdAt})))`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo))
      .groupBy(pageViews.visitorId);

    let avgSessionDuration = '0m 0s';
    if (sessionRes.length > 0) {
      const totalSecs = sessionRes.reduce((acc, curr) => acc + (Number(curr.durationSec) || 0), 0);
      const avgSecs = Math.round(totalSecs / sessionRes.length);
      const mins = Math.floor(avgSecs / 60);
      const secs = avgSecs % 60;
      avgSessionDuration = `${mins}m ${secs}s`;
    }

    // 10. Device breakdown with normalized grouping to prevent duplicate keys
    const deviceRes = await db
      .select({
        deviceKey: sql`COALESCE(NULLIF(LOWER(${pageViews.device}), ''), 'desktop')`,
        count: count(pageViews.id),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo))
      .groupBy(sql`COALESCE(NULLIF(LOWER(${pageViews.device}), ''), 'desktop')`);

    const totalDeviceViews = deviceRes.reduce((acc, curr) => acc + Number(curr.count), 0);
    const deviceBreakdown = deviceRes.map((d) => {
      const rawName = String(d.deviceKey || 'desktop');
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      return {
        name: formattedName,
        value: Number(d.count),
        percentage: totalDeviceViews > 0 ? Math.round((Number(d.count) / totalDeviceViews) * 100) : 0,
      };
    });

    return NextResponse.json({
      metrics: {
        activeNow,
        uniqueVisitors: currentUniqueVisitors,
        uniqueVisitorsChangePct,
        totalPageViews: currentTotalViews,
        pageViewsChangePct,
        totalOrders: currentTotalOrders,
        ordersChangePct,
        totalRevenue: Number(currentTotalRevenue.toFixed(2)),
        revenueChangePct,
        avgSessionDuration,
        peakSpike,
      },
      chartData,
      hourlyChartData,
      salesChartData,
      topPages: topPagesRes.map((p) => ({ path: p.path, views: Number(p.views) })),
      deviceBreakdown,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

