type SpecificationsTableProps = {
  title?: string;
  rows: { label: string; value: string }[];
  headingLevel?: 2 | 3;
};

export default function SpecificationsTable({
  title,
  rows,
  headingLevel = 3,
}: SpecificationsTableProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl font-[family-name:var(--shop-font-body)]">
      {title && (
        <div className="mb-6 md:mb-8">
          <span
            aria-hidden="true"
            className="mb-4 block h-px w-12 bg-[var(--shop-gold)]"
          />
          <Heading className="break-words font-[family-name:var(--shop-font-heading)] text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--shop-text-primary)] md:text-3xl">
            {title}
          </Heading>
        </div>
      )}
      <div className="overflow-hidden rounded-[var(--shop-radius-md)] border border-[var(--shop-border-gold)] bg-[var(--shop-bg-base)] shadow-[var(--shop-shadow-md)]">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6">
          <caption className="sr-only">{title || "Specifications"}</caption>
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[65%]" />
          </colgroup>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-[var(--shop-border-light)] last:border-b-0"
              >
                <th
                  scope="row"
                  className="bg-[var(--shop-gold-faint)] px-4 py-4 align-top text-xs font-medium tracking-[0.02em] text-[var(--shop-text-secondary)] [overflow-wrap:anywhere] md:px-8 md:py-6 md:text-sm"
                >
                  {row.label}
                </th>
                <td className="border-l border-[var(--shop-border-gold)] px-4 py-4 align-top font-medium text-[var(--shop-text-primary)] [overflow-wrap:anywhere] md:px-8 md:py-6">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
