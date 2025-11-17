import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DISPLAY_FORMAT = "dd/MM/yyyy";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  required?: boolean;
  allowClear?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className,
  inputClassName,
  id,
  name,
  required,
  allowClear = false,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState(() =>
    value ? format(value, DISPLAY_FORMAT, { locale: ptBR }) : ""
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [month, setMonth] = React.useState<Date | undefined>(value);

  React.useEffect(() => {
    setSelectedDate(value);
    setMonth(value);
    setInputValue(value ? format(value, DISPLAY_FORMAT, { locale: ptBR }) : "");
  }, [value]);

  const notifyChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setMonth(date);
    onChange?.(date);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numbersOnly = event.target.value.replace(/\D/g, "");

    let formatted = numbersOnly;
    if (numbersOnly.length >= 3) {
      formatted = `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2, 4)}`;
      if (numbersOnly.length >= 5) {
        formatted += `/${numbersOnly.slice(4, 8)}`;
      }
    }

    setInputValue(formatted);

    if (formatted.length === 10) {
      const parsedDate = parse(formatted, DISPLAY_FORMAT, new Date());
      if (isValid(parsedDate)) {
        notifyChange(parsedDate);
        setInputValue(format(parsedDate, DISPLAY_FORMAT, { locale: ptBR }));
      }
    } else if (formatted.length === 0 && allowClear) {
      notifyChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) {
      if (allowClear) {
        notifyChange(undefined);
        setInputValue("");
      }
      return;
    }
    notifyChange(date);
    setInputValue(format(date, DISPLAY_FORMAT, { locale: ptBR }));
    setIsOpen(false);
  };

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (relatedTarget && relatedTarget.closest('[role="dialog"]')) {
      return;
    }

    if (!inputValue) {
      if (!allowClear && value) {
        setInputValue(format(value, DISPLAY_FORMAT, { locale: ptBR }));
      }
      setIsOpen(false);
      return;
    }

    if (inputValue.length === 10) {
      const parsedDate = parse(inputValue, DISPLAY_FORMAT, new Date());
      if (isValid(parsedDate)) {
        notifyChange(parsedDate);
        setInputValue(format(parsedDate, DISPLAY_FORMAT, { locale: ptBR }));
        setIsOpen(false);
        return;
      }
    }

    // Reverte para o valor original em caso de data inválida/incompleta
    setInputValue(value ? format(value, DISPLAY_FORMAT, { locale: ptBR }) : "");
    setIsOpen(false);
  };

  const toggleOpen = (next: boolean) => {
    if (disabled) return;
    setIsOpen(next);
  };

  return (
    <Popover open={isOpen} onOpenChange={toggleOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <Input
            id={id}
            name={name}
            required={required}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onClick={() => toggleOpen(true)}
            onFocus={() => toggleOpen(true)}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={10}
            className={cn("pr-9", inputClassName)}
          />
          <CalendarIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleCalendarSelect}
          month={month}
          onMonthChange={setMonth}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
