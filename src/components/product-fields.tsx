import { FieldInput } from "@/components/field-input";
import { PartsGrid } from "@/components/parts-grid";
import { Badge } from "@/components/ui/badge";
import type { StateOf } from "@/lib/review/field-state";
import { pathKey } from "@/lib/review/issues";
import type { ProductMatch } from "@/lib/review/rfq";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type Decision = "accept" | "reject" | undefined;

const ROLE_TONE = {
  requested: "border-border text-muted-foreground",
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  accept: "border-emerald-300 bg-emerald-50 text-emerald-700",
  reject: "border-rose-300 bg-rose-50 text-rose-700",
};

/** "Requested", "ALT for MS35206-228 · Accepted", "Extra · Rejected": what the buyer decided. */
function RoleChip({
  match,
  decision,
}: {
  match: ProductMatch;
  decision: Decision;
}) {
  const role =
    match.role === "requested"
      ? "Requested"
      : match.role === "alternate"
        ? `ALT for ${match.requested?.pn}`
        : "Extra";
  const tone: keyof typeof ROLE_TONE =
    match.role === "requested" || !match.decisionId
      ? "requested"
      : (decision ?? "pending");
  return (
    <Badge
      variant="outline"
      className={cn("rounded-sm font-mono text-[11px]", ROLE_TONE[tone])}
    >
      {role}
      {decision && ` · ${decision === "accept" ? "Accepted" : "Rejected"}`}
    </Badge>
  );
}

export function ProductFields({
  product,
  match,
  decision,
  onUndo,
  onChange,
  stateOf,
  activePaths,
}: {
  product: Product;
  match: ProductMatch;
  decision: Decision;
  onUndo: () => void;
  onChange: (product: Product) => void;
  stateOf: StateOf;
  activePaths: Set<string>;
}) {
  const rejected = decision === "reject";
  function reviewProps(field: keyof Product & string) {
    const key = pathKey({ productId: product.id, field });
    return {
      pathKey: key,
      state: stateOf(key, product[field]),
      active: activePaths.has(key),
    };
  }

  return (
    <fieldset
      data-product-id={product.id}
      className="relative min-w-0 scroll-mt-5 border-b py-5 last:border-b-0"
    >
      <legend className="sr-only">Product {product.partNumber}</legend>
      <div className="mb-4 flex items-center justify-between gap-3 px-5 md:px-7">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3
            className={cn(
              "font-mono text-sm font-semibold",
              rejected && "text-muted-foreground line-through",
            )}
          >
            {product.partNumber || "Unnamed part"}
          </h3>
          <RoleChip match={match} decision={decision} />
          {decision && (
            <button
              type="button"
              onClick={onUndo}
              aria-label={`Undo ${decision === "accept" ? "accept" : "reject"} for ${product.partNumber}`}
              className="cursor-pointer rounded-sm px-1 text-[11px] text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Undo
            </button>
          )}
        </div>
        {product.lines.length === 0 ? (
          <Badge variant="secondary">No bid</Badge>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            {product.lines.length} quantity breaks
          </span>
        )}
      </div>
      {rejected && (
        <p className="-mt-2 mb-4 px-5 text-xs text-muted-foreground md:px-7">
          Rejected and excluded from review.
          {match.role === "alternate" &&
            ` ${match.requested?.pn} goes to Fix unless another product covers it.`}
        </p>
      )}
      <div
        className={cn(
          "grid grid-cols-2 gap-3 px-5 md:px-7",
          rejected && "opacity-60",
        )}
      >
        <FieldInput
          label="Part number"
          {...reviewProps("partNumber")}
          value={product.partNumber}
          onChange={(partNumber) => onChange({ ...product, partNumber })}
        />
        <FieldInput
          label="NSN"
          {...reviewProps("nsn")}
          value={product.nsn}
          onChange={(nsn) => onChange({ ...product, nsn })}
        />
        <div className="col-span-2">
          <FieldInput
            label="Description"
            type="textarea"
            {...reviewProps("description")}
            value={product.description}
            onChange={(description) => onChange({ ...product, description })}
          />
        </div>
        <FieldInput
          label="Manufacturer part number"
          {...reviewProps("mfrPartNumber")}
          value={product.mfrPartNumber}
          onChange={(mfrPartNumber) => onChange({ ...product, mfrPartNumber })}
        />
        <FieldInput
          label="Manufacturer CAGE"
          {...reviewProps("mfrCage")}
          value={product.mfrCage}
          onChange={(mfrCage) => onChange({ ...product, mfrCage })}
        />
        <FieldInput
          label="Country of origin"
          {...reviewProps("coo")}
          value={product.coo}
          onChange={(coo) => onChange({ ...product, coo })}
        />
        <FieldInput
          label="NRE cost"
          type="number"
          {...reviewProps("nreCost")}
          value={product.nreCost}
          onChange={(nreCost) => onChange({ ...product, nreCost })}
        />
        <div className="col-span-2">
          <FieldInput
            label="Certifications"
            type="textarea"
            {...reviewProps("certifications")}
            value={product.certifications}
            onChange={(certifications) =>
              onChange({ ...product, certifications })
            }
          />
        </div>
        <FieldInput
          label="Packaging included"
          type="boolean"
          {...reviewProps("packagingIncluded")}
          value={product.packagingIncluded}
          onChange={(packagingIncluded) =>
            onChange({ ...product, packagingIncluded })
          }
        />
        <FieldInput
          label="Shipping included"
          type="boolean"
          {...reviewProps("shippingIncluded")}
          value={product.shippingIncluded}
          onChange={(shippingIncluded) =>
            onChange({ ...product, shippingIncluded })
          }
        />
        <FieldInput
          label="Hazmat item"
          type="boolean"
          {...reviewProps("hazmatItem")}
          value={product.hazmatItem}
          onChange={(hazmatItem) => onChange({ ...product, hazmatItem })}
        />
        <div className="col-span-2">
          <FieldInput
            label="Product notes"
            type="textarea"
            {...reviewProps("additionalNotes")}
            value={product.additionalNotes}
            onChange={(additionalNotes) =>
              onChange({ ...product, additionalNotes })
            }
          />
        </div>
      </div>
      {product.lines.length > 0 && (
        <div className={cn("mt-5", rejected && "opacity-60")}>
          <PartsGrid
            productId={product.id}
            breaks={match.requested?.breaks}
            stateOf={stateOf}
            activePaths={activePaths}
            lines={product.lines}
            onChange={(line) =>
              onChange({
                ...product,
                lines: product.lines.map((current) =>
                  current.id === line.id ? line : current,
                ),
              })
            }
          />
        </div>
      )}
    </fieldset>
  );
}
