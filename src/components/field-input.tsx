import { useId } from "react";

import {
  FIELD_STATE_LABEL,
  FIELD_STATES,
  type FieldState,
} from "@/lib/review/field-state";
import { cn } from "@/lib/utils";

const STATE_INPUT: Record<FieldState, string> = {
  extracted: "border-l-2 border-l-violet-400 bg-background",
  edited: "border-l-2 border-l-blue-500 bg-blue-50/50",
  confirmed: "border-l-2 border-l-emerald-500 bg-emerald-50/50",
  flagged: "border-l-2 border-l-amber-500 bg-amber-50/50",
};

const STATE_BADGE: Record<FieldState, string> = {
  extracted: "bg-violet-50 text-violet-700",
  edited: "bg-blue-50 text-blue-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  flagged: "bg-amber-50 text-amber-800",
};

const STATE_DOT: Record<FieldState, string> = {
  extracted: "bg-violet-400",
  edited: "bg-blue-500",
  confirmed: "bg-emerald-500",
  flagged: "bg-amber-500",
};

/** Key for the colored left border used on compact (table) cells. */
export function FieldStateLegend() {
  return (
    <ul
      aria-label="Field states"
      className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex"
    >
      {FIELD_STATES.map((state) => (
        <li key={state} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", STATE_DOT[state])}
          />
          {FIELD_STATE_LABEL[state]}
        </li>
      ))}
    </ul>
  );
}

type FieldInputProps = {
  label: string;
  compact?: boolean;
  pathKey?: string;
  state?: FieldState;
  active?: boolean;
} & (
  | {
      type?: "text" | "textarea";
      value: string;
      onChange: (value: string) => void;
    }
  | {
      type: "number";
      value: number | null;
      onChange: (value: number | null) => void;
      step?: number | "any";
    }
  | {
      type: "boolean";
      value: boolean | null;
      onChange: (value: boolean | null) => void;
    }
);

export function FieldInput(props: FieldInputProps) {
  const reviewId = useId();
  const inputClassName = cn(
    "w-full min-w-0 rounded-sm border border-input px-2 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring invalid:border-destructive",
    props.state ? STATE_INPUT[props.state] : "bg-background",
    props.active && "ring-2 ring-amber-500",
  );

  return (
    <label
      data-path={props.pathKey}
      data-state={props.state}
      title={
        props.compact && props.state
          ? `${props.label} · ${FIELD_STATE_LABEL[props.state]}`
          : undefined
      }
      className={cn(
        "block scroll-mt-5 space-y-1.5",
        props.compact && "min-w-24",
      )}
    >
      <span
        className={cn(
          "block text-[11px] text-muted-foreground",
          props.compact && "sr-only",
        )}
      >
        {props.label}
        {props.state && (
          <span
            id={reviewId}
            className={cn(
              "ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium",
              STATE_BADGE[props.state],
            )}
          >
            {FIELD_STATE_LABEL[props.state]}
          </span>
        )}
      </span>
      {props.type === "boolean" ? (
        <select
          aria-describedby={props.state ? reviewId : undefined}
          className={inputClassName}
          value={props.value === null ? "" : String(props.value)}
          onChange={(event) =>
            props.onChange(
              event.target.value === "" ? null : event.target.value === "true",
            )
          }
        >
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : props.type === "number" ? (
        <input
          key={props.value ?? ""}
          aria-describedby={props.state ? reviewId : undefined}
          type="number"
          step={props.step ?? "any"}
          defaultValue={props.value ?? ""}
          className={inputClassName}
          onBlur={(event) => {
            const input = event.currentTarget;
            if (!input.validity.valid) {
              input.reportValidity();
              return;
            }
            if (input.value === "") {
              props.onChange(null);
            } else if (Number.isFinite(input.valueAsNumber)) {
              props.onChange(input.valueAsNumber);
            }
          }}
        />
      ) : props.type === "textarea" ? (
        <textarea
          aria-describedby={props.state ? reviewId : undefined}
          rows={3}
          className={cn(inputClassName, "resize-y")}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      ) : (
        <input
          aria-describedby={props.state ? reviewId : undefined}
          type="text"
          className={inputClassName}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      )}
    </label>
  );
}
