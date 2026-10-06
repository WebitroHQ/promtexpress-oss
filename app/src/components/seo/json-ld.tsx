// Renders a single schema.org JSON-LD block as a <script> tag.
// Server component — runs at request/build time; the embedded JSON is static
// from the React tree's perspective.

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // The data shape is controlled by our schema generators in
      // src/lib/seo/schemas/*; we never accept user-controlled JSON here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
