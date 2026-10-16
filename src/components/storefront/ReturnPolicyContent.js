/**
 * Single source of truth for the exchange & store-credit policy copy.
 * Rendered by the /returns policy page and the product detail accordion.
 */
export default function ReturnPolicyContent({ compact = false }) {
  const body = compact ? 'text-[12px] leading-relaxed text-warm-600' : 'text-sm leading-relaxed text-warm-700';
  const strong = 'font-semibold text-warm-900';

  return (
    <div className={`space-y-3 ${body}`}>
      <h2 className={`font-bold text-warm-900 ${compact ? 'text-[13px]' : 'text-base'}`}>
        Exchange &amp; Store Credit Policy
      </h2>

      <p>
        At Hodahub, we do not offer cash refunds. Instead, we provide easy exchange to
        ensure customer satisfaction.
      </p>

      <p>
        <strong className={strong}>Exchange Window:</strong> You may request an exchange within{' '}
        <strong className={strong}>48 hours of delivery</strong> by contacting our support team.
      </p>

      <div className="space-y-1.5">
        <h3 className={`font-semibold text-warm-900 ${compact ? 'text-[12px]' : 'text-sm'}`}>Conditions:</h3>
        <ol className="list-decimal pl-5 space-y-1 marker:text-warm-400">
          <li>Item must be unused and in original packaging.</li>
          <li>All original tags, accessories, and documentation must be included.</li>
          <li>
            The protective <em>polythene/film on the watch must be intact</em>.
          </li>
          <li>
            <em>A clear unboxing video (from start to finish)</em> is required for any exchange or damage claim.
          </li>
        </ol>
      </div>



      <p>
        <strong className={strong}>Damaged / Defective Items:</strong> If the product is delivered damaged or
        defective, we will provide a free replacement of the same model (subject to availability), subject to
        unboxing video proof.
      </p>

      <p>
        Your trust matters to us — stays safe with Hodahub.
      </p>
    </div>
  );
}
