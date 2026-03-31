"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CreatableOption {
  value: string;
  label: string;
}

interface CreatableSelectProps {
  options: CreatableOption[];
  value?: string;
  onChange: (value: string) => void;
  onCreate: (inputValue: string) => Promise<CreatableOption | null>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CreatableSelect({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Select...",
  disabled = false,
  className,
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const showCreateOption =
    inputValue.trim() !== "" &&
    !options.some(
      (opt) => opt.label.toLowerCase() === inputValue.trim().toLowerCase(),
    );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setInputValue("");
    setOpen(false);
  };

  const handleCreate = async () => {
    if (isCreating || !inputValue.trim()) return;

    setIsCreating(true);
    try {
      const newOption = await onCreate(inputValue.trim());
      if (newOption) {
        onChange(newOption.value);
        setInputValue("");
        setOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-(--radix-popover-trigger-width) rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none"
          sideOffset={4}
          align="start"
        >
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Search or create..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showCreateOption) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 && !showCreateOption && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No options found
              </div>
            )}
            {filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  opt.value === value && "bg-accent text-accent-foreground",
                )}
                onClick={() => handleSelect(opt.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    opt.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {opt.label}
              </div>
            ))}
            {showCreateOption && (
              <div
                className="relative flex cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-primary"
                onClick={handleCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isCreating ? "Creating..." : `Create "${inputValue.trim()}"`}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
