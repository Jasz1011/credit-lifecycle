import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseDateInput } from '../lib/dateInput';

interface BirthDatePickerProps {
  text: string;
  language: string;
  invalid: boolean;
  describedBy: string;
  onTextChange: (value: string) => void;
  onDateSelect: (isoDate: string) => void;
  onBlur: () => void;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

export function BirthDatePicker({
  text, language, invalid, describedBy, onTextChange, onDateSelect, onBlur,
}: BirthDatePickerProps) {
  const { t } = useTranslation();
  const locale = language.startsWith('en') ? 'en-US' : 'es-NI';
  const weekStartsOn = language.startsWith('en') ? 0 : 1;
  const todayIso = isoDate(new Date());
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const minDate = utcDate(today.getUTCFullYear() - 80, today.getUTCMonth(), today.getUTCDate());
  const minIso = isoDate(minDate);
  const selectedIso = parseDateInput(text, language);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());
  const [focusedIso, setFocusedIso] = useState(todayIso);
  const focusDayOnRender = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const popoverId = useId();
  const firstYear = minDate.getUTCFullYear();
  const firstMonth = minDate.getUTCMonth();
  const canGoBack = viewYear > firstYear || viewMonth > firstMonth;
  const canAdvance = viewYear < today.getUTCFullYear() || viewMonth < today.getUTCMonth();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !focusDayOnRender.current) return;
    dayRefs.current.get(focusedIso)?.focus();
    focusDayOnRender.current = false;
  }, [focusedIso, open, viewMonth, viewYear]);

  const openCalendar = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const focus = selectedIso && selectedIso >= minIso && selectedIso <= todayIso
      ? selectedIso : todayIso;
    const date = new Date(`${focus}T00:00:00.000Z`);
    setViewYear(date.getUTCFullYear());
    setViewMonth(date.getUTCMonth());
    setFocusedIso(focus);
    focusDayOnRender.current = true;
    setOpen(true);
  };

  const moveMonth = (offset: number) => {
    const target = utcDate(viewYear, viewMonth + offset, 1);
    setViewYear(target.getUTCFullYear());
    setViewMonth(target.getUTCMonth());
    setFocusedIso(isoDate(target));
  };

  const moveFocus = (current: Date, key: string) => {
    const weekday = (current.getUTCDay() - weekStartsOn + 7) % 7;
    let target: Date;
    switch (key) {
      case 'ArrowLeft': target = utcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - 1); break;
      case 'ArrowRight': target = utcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() + 1); break;
      case 'ArrowUp': target = utcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - 7); break;
      case 'ArrowDown': target = utcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() + 7); break;
      case 'Home': target = utcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - weekday); break;
      case 'End': target = utcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() + 6 - weekday); break;
      case 'PageUp': target = utcDate(current.getUTCFullYear(), current.getUTCMonth() - 1, Math.min(current.getUTCDate(), utcDate(current.getUTCFullYear(), current.getUTCMonth(), 0).getUTCDate())); break;
      case 'PageDown': target = utcDate(current.getUTCFullYear(), current.getUTCMonth() + 1, Math.min(current.getUTCDate(), utcDate(current.getUTCFullYear(), current.getUTCMonth() + 2, 0).getUTCDate())); break;
      default: return false;
    }
    const targetIso = isoDate(target);
    if (targetIso < minIso || targetIso > todayIso) return true;
    focusDayOnRender.current = true;
    setViewYear(target.getUTCFullYear());
    setViewMonth(target.getUTCMonth());
    setFocusedIso(targetIso);
    return true;
  };

  const firstDay = utcDate(viewYear, viewMonth, 1);
  const leadingDays = (firstDay.getUTCDay() - weekStartsOn + 7) % 7;
  const days = Array.from({ length: 42 }, (_, index) => utcDate(viewYear, viewMonth, index + 1 - leadingDays));
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(utcDate(2020, index, 1)));
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(utcDate(2020, 5, 7 + ((index + weekStartsOn) % 7))));
  const fullDate = new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  return (
    <div className="localized-date-field" ref={rootRef}>
      <div className="date-input-wrap">
        <CalendarDays size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          id="birth-date-input"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder={t('form.datePlaceholder')}
          value={text}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          onChange={(event) => onTextChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.altKey && event.key === 'ArrowDown') {
              event.preventDefault();
              openCalendar();
            }
          }}
        />
        <button
          ref={triggerRef}
          type="button"
          className="date-picker-button"
          aria-label={t('form.openCalendar')}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-haspopup="dialog"
          onClick={openCalendar}
        ><ChevronDown size={17} aria-hidden="true" /></button>
      </div>
      {open ? <div id={popoverId} className="date-popover" role="dialog" aria-label={t('form.calendarTitle')}>
        <div className="date-calendar-header">
          <button type="button" className="date-calendar-nav" aria-label={t('form.previousMonth')} disabled={!canGoBack} onClick={() => moveMonth(-1)}><ChevronLeft size={17} aria-hidden="true" /></button>
          <select aria-label={t('form.calendarMonth')} value={viewMonth} onChange={(event) => {
            const month = Number(event.target.value);
            setViewMonth(month);
            setFocusedIso(isoDate(utcDate(viewYear, month, 1)));
          }}>
            {monthNames.map((month, index) => <option key={month} value={index} disabled={(viewYear === firstYear && index < firstMonth) || (viewYear === today.getUTCFullYear() && index > today.getUTCMonth())}>{month}</option>)}
          </select>
          <select aria-label={t('form.calendarYear')} value={viewYear} onChange={(event) => {
            const year = Number(event.target.value);
            const month = year === firstYear ? Math.max(viewMonth, firstMonth)
              : year === today.getUTCFullYear() ? Math.min(viewMonth, today.getUTCMonth()) : viewMonth;
            setViewYear(year);
            setViewMonth(month);
            setFocusedIso(isoDate(utcDate(year, month, 1)));
          }}>
            {Array.from({ length: today.getUTCFullYear() - firstYear + 1 }, (_, index) => today.getUTCFullYear() - index)
              .map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="button" className="date-calendar-nav" aria-label={t('form.nextMonth')} disabled={!canAdvance} onClick={() => moveMonth(1)}><ChevronRight size={17} aria-hidden="true" /></button>
        </div>
        <div className="date-calendar-weekdays" aria-hidden="true">
          {weekdays.map((day, index) => <span key={index}>{day}</span>)}
        </div>
        <div className="date-calendar-days">
          {days.map((day) => {
            const date = isoDate(day);
            const inMonth = day.getUTCMonth() === viewMonth;
            if (!inMonth) return <span className="date-outside" aria-hidden="true" key={date}>{day.getUTCDate()}</span>;
            return <button
              key={date}
              ref={(node) => { if (node) dayRefs.current.set(date, node); else dayRefs.current.delete(date); }}
              type="button"
              className={`date-day${date === selectedIso ? ' selected' : ''}${date === todayIso ? ' today' : ''}`}
              aria-label={fullDate.format(day)}
              aria-pressed={date === selectedIso}
              aria-current={date === todayIso ? 'date' : undefined}
              tabIndex={date === focusedIso ? 0 : -1}
              disabled={date < minIso || date > todayIso}
              onKeyDown={(event) => { if (moveFocus(day, event.key)) event.preventDefault(); }}
              onClick={() => {
                onDateSelect(date);
                setOpen(false);
                inputRef.current?.focus();
              }}
            >{day.getUTCDate()}</button>;
          })}
        </div>
      </div> : null}
    </div>
  );
}
