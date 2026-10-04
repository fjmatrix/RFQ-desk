import {
  createColumnHelper,
  flexRender,
  metaHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import { FieldInput } from "@/components/field-input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FieldState, StateOf } from "@/lib/review/field-state";
import { pathKey } from "@/lib/review/issues";
import type { Line } from "@/lib/types";
import { cn } from "@/lib/utils";

const features = tableFeatures({
  tableMeta: metaHelper<{
    onChange: (line: Line) => void;
    fieldState: (
      lineId: string,
      field: string,
      value: unknown,
    ) => FieldState | undefined;
  }>(),
});
const columnHelper = createColumnHelper<typeof features, Line>();
const columns = columnHelper.columns([
  columnHelper.accessor("quantity", {
    header: "Quantity",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Quantity"
        type="number"
        step={1}
        value={row.original.quantity}
        onChange={(quantity) =>
          table.options.meta!.onChange({
            ...row.original,
            quantity,
            // Keep Price = Unit cost × Qty when either value changes.
            price:
              quantity === null || row.original.unitCost === null
                ? null
                : Number((quantity * row.original.unitCost).toFixed(2)),
          })
        }
      />
    ),
  }),
  columnHelper.accessor("isQuoting", {
    header: "Quoting",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Quoting"
        type="boolean"
        value={row.original.isQuoting}
        onChange={(isQuoting) =>
          table.options.meta!.onChange({ ...row.original, isQuoting })
        }
      />
    ),
  }),
  columnHelper.accessor("unitCost", {
    header: "Unit price",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Unit price"
        type="number"
        value={row.original.unitCost}
        onChange={(unitCost) =>
          table.options.meta!.onChange({
            ...row.original,
            unitCost,
            price:
              unitCost === null || row.original.quantity === null
                ? null
                : Number((unitCost * row.original.quantity).toFixed(2)),
          })
        }
      />
    ),
  }),
  columnHelper.accessor("price", {
    header: "Extended price",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Extended price"
        type="number"
        value={row.original.price}
        onChange={(price) =>
          table.options.meta!.onChange({ ...row.original, price })
        }
      />
    ),
  }),
  columnHelper.accessor("currency", {
    header: "Currency",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Currency"
        value={row.original.currency}
        onChange={(currency) =>
          table.options.meta!.onChange({ ...row.original, currency })
        }
      />
    ),
  }),
  columnHelper.accessor("leadTime", {
    header: "Lead time (days)",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Lead time (days)"
        type="number"
        step={1}
        value={row.original.leadTime}
        onChange={(leadTime) =>
          table.options.meta!.onChange({ ...row.original, leadTime })
        }
      />
    ),
  }),
  columnHelper.accessor("isFat", {
    header: "FAT",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="FAT"
        type="boolean"
        value={row.original.isFat}
        onChange={(isFat) =>
          table.options.meta!.onChange({ ...row.original, isFat })
        }
      />
    ),
  }),
  columnHelper.accessor("variance", {
    header: "Variance",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Variance"
        value={row.original.variance}
        onChange={(variance) =>
          table.options.meta!.onChange({ ...row.original, variance })
        }
      />
    ),
  }),
  columnHelper.accessor("additionalNotes", {
    header: "Line notes",
    cell: ({ row, table, column, getValue }) => (
      <FieldInput
        compact
        state={table.options.meta!.fieldState(
          row.original.id,
          column.id,
          getValue(),
        )}
        label="Line notes"
        type="textarea"
        value={row.original.additionalNotes}
        onChange={(additionalNotes) =>
          table.options.meta!.onChange({ ...row.original, additionalNotes })
        }
      />
    ),
  }),
]);

export function PartsGrid({
  productId,
  breaks,
  lines,
  onChange,
  stateOf,
  activePaths,
}: {
  productId: string;
  /** Requested breaks from the matched RFQ line; an alternate uses its requested part's. */
  breaks: number[] | undefined;
  lines: Line[];
  onChange: (line: Line) => void;
  stateOf: StateOf;
  activePaths: Set<string>;
}) {
  const table = useTable({
    features,
    columns,
    data: lines,
    meta: {
      onChange,
      fieldState: (lineId, field, value) =>
        stateOf(pathKey({ productId, lineId, field }), value),
    },
    getRowId: (line) => line.id,
  });

  // Requested breaks with no line at that quantity show as grey rows, merged in by quantity.
  // Lines keep their stored order so a row never jumps while its quantity is being typed.
  const breakKey = (quantity: number) =>
    pathKey({ productId, field: `break:${quantity}` });
  const missing = (breaks ?? [])
    .filter((quantity) => !lines.some((line) => line.quantity === quantity))
    .sort((a, b) => a - b);
  const rows: (
    | { row: ReturnType<typeof table.getRowModel>["rows"][number] }
    | { quantity: number }
  )[] = [];
  for (const row of table.getRowModel().rows) {
    const quantity = row.original.quantity;
    while (quantity !== null && missing.length && missing[0] < quantity) {
      rows.push({ quantity: missing.shift()! });
    }
    rows.push({ row });
  }
  rows.push(...missing.map((quantity) => ({ quantity })));

  return (
    <Table className="text-xs tabular-nums">
      <TableCaption className="sr-only">Quantity breaks</TableCaption>
      <TableHeader className="bg-muted">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                scope="col"
                className="px-2 text-[11px] text-muted-foreground first:pl-5 last:pr-5 md:first:pl-7 md:last:pr-7"
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((item) => {
          if (!("row" in item)) {
            const key = breakKey(item.quantity);
            return (
              <TableRow
                key={key}
                data-path={key}
                className={cn(
                  "scroll-mt-5 bg-muted/40 text-muted-foreground hover:bg-muted/40",
                  activePaths.has(key) && "ring-2 ring-amber-500 ring-inset",
                )}
              >
                <TableCell className="px-2 py-2.5 pl-5 md:pl-7">
                  {item.quantity}
                </TableCell>
                <TableCell
                  colSpan={columns.length - 1}
                  className="px-2 py-2.5 pr-5 md:pr-7"
                >
                  Requested break, not quoted
                </TableCell>
              </TableRow>
            );
          }
          const { row } = item;
          const { quantity, isQuoting } = row.original;
          const requested = quantity !== null && breaks?.includes(quantity);
          return (
            <TableRow
              key={row.id}
              // A requested break marked not quoting is where its Fix item lands.
              data-path={
                requested && isQuoting === false
                  ? breakKey(quantity)
                  : undefined
              }
            >
              {row.getAllCells().map((cell) => {
                const key = pathKey({
                  productId,
                  lineId: row.original.id,
                  field: cell.column.id,
                });
                return (
                  <TableCell
                    key={cell.id}
                    data-path={key}
                    className={cn(
                      "scroll-mt-5 px-2 py-2 align-top first:pl-5 last:pr-5 md:first:pl-7 md:last:pr-7",
                      stateOf(key, cell.getValue()) === "flagged" &&
                        "bg-amber-50",
                      activePaths.has(key) &&
                        "ring-2 ring-amber-500 ring-inset",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    {cell.column.id === "quantity" &&
                      breaks &&
                      quantity !== null &&
                      !requested && (
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          not requested
                        </span>
                      )}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
