import { FieldInput } from "@/components/field-input";
import type { StateOf } from "@/lib/review/field-state";
import { pathKey } from "@/lib/review/issues";
import type { Vendor } from "@/lib/types";

export function QuoteFields({
  vendor,
  onChange,
  stateOf,
  activePaths,
}: {
  vendor: Vendor;
  onChange: (vendor: Vendor) => void;
  stateOf: StateOf;
  activePaths: Set<string>;
}) {
  function reviewProps(field: keyof Vendor & string) {
    const key = pathKey({ field });
    return {
      pathKey: key,
      state: stateOf(key, vendor[field]),
      active: activePaths.has(key),
    };
  }

  return (
    <fieldset className="relative grid grid-cols-2 gap-3 border-b px-5 py-5 md:px-7">
      <legend className="sr-only">Quote details</legend>
      <h3 className="col-span-2 text-sm font-semibold">Quote details</h3>
      <FieldInput
        label="Vendor name"
        {...reviewProps("name")}
        value={vendor.name}
        onChange={(name) => onChange({ ...vendor, name })}
      />
      <FieldInput
        label="Vendor CAGE"
        {...reviewProps("cage")}
        value={vendor.cage}
        onChange={(cage) => onChange({ ...vendor, cage })}
      />
      <FieldInput
        label="Contact name"
        {...reviewProps("contactName")}
        value={vendor.contactName}
        onChange={(contactName) => onChange({ ...vendor, contactName })}
      />
      <FieldInput
        label="Contact email"
        {...reviewProps("contactEmail")}
        value={vendor.contactEmail}
        onChange={(contactEmail) => onChange({ ...vendor, contactEmail })}
      />
      <FieldInput
        label="Vendor contact"
        {...reviewProps("vendorContact")}
        value={vendor.vendorContact}
        onChange={(vendorContact) => onChange({ ...vendor, vendorContact })}
      />
      <FieldInput
        label="Payment terms"
        {...reviewProps("paymentTerms")}
        value={vendor.paymentTerms}
        onChange={(paymentTerms) => onChange({ ...vendor, paymentTerms })}
      />
      <FieldInput
        label="Quote validity (days)"
        type="number"
        step={1}
        {...reviewProps("daysQuoteValid")}
        value={vendor.daysQuoteValid}
        onChange={(daysQuoteValid) => onChange({ ...vendor, daysQuoteValid })}
      />
      <div className="col-span-2">
        <FieldInput
          label="Quote notes"
          type="textarea"
          {...reviewProps("additionalNotes")}
          value={vendor.additionalNotes}
          onChange={(additionalNotes) =>
            onChange({ ...vendor, additionalNotes })
          }
        />
      </div>
    </fieldset>
  );
}
