import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { SHIFTS } from "../types/attendance";
import type { ShiftType } from "../types/attendance";

type Props = {
  anchorRect: DOMRect;
  initialShiftType: ShiftType;
  initialShiftTime: string;
  onConfirm: (shiftType: ShiftType, shiftTime: string) => void;
  onCancel: () => void;
};

export default function ShiftPickerPortal({
  anchorRect,
  initialShiftType,
  initialShiftTime,
  onConfirm,
  onCancel,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [shiftType, setShiftType] = useState<ShiftType>(initialShiftType);
  const [shiftTime, setShiftTime] = useState<string>(initialShiftTime);

  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;

    const POPUP_W = 260;
    const POPUP_H = popup.offsetHeight || 320;
    const GAP = 8;
    const EDGE = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchorRect.bottom + GAP;
    let left = anchorRect.left + anchorRect.width / 2 - POPUP_W / 2;

    if (top + POPUP_H > vh - EDGE) {
      const topAbove = anchorRect.top - POPUP_H - GAP;
      top = topAbove >= EDGE ? topAbove : vh - POPUP_H - EDGE;
    }
    if (left + POPUP_W > vw - EDGE) left = vw - POPUP_W - EDGE;
    if (left < EDGE) left = EDGE;

    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const handleShiftSelect = (value: string) => {
    const found = SHIFTS.find((s) => s.value === value);
    if (!found) return;
    setShiftType(found.value as ShiftType);
    if (found.value !== "CUSTOM") setShiftTime(found.time);
  };

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 260,
        zIndex: 9999,
      }}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800">Chọn ca làm việc</span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {SHIFTS.map((s) => (
          <label
            key={s.value}
            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
              shiftType === s.value
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={shiftType === s.value}
                onChange={() => handleShiftSelect(s.value)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="font-medium text-slate-700">{s.label}</span>
            </div>
            {s.value !== "CUSTOM" && (
              <span className="text-xs text-slate-500">{s.time}</span>
            )}
          </label>
        ))}
      </div>

      {shiftType === "CUSTOM" && (
        <div className="mt-2">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Giờ bắt đầu
          </label>
          <div className="flex items-center gap-2">
            <select
              value={(shiftTime.split(":")[0] || "00").padStart(2, "0")}
              onChange={(e) => {
                const m = shiftTime.split(":")[1] || "00";
                setShiftTime(`${e.target.value}:${m}`);
              }}
              className="h-9 flex-1 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {Array.from({ length: 24 }, (_, i) =>
                String(i).padStart(2, "0"),
              ).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-slate-400">:</span>
            <select
              value={shiftTime.split(":")[1] || "00"}
              onChange={(e) => {
                const h = (shiftTime.split(":")[0] || "00").padStart(2, "0");
                setShiftTime(`${h}:${e.target.value}`);
              }}
              className="h-9 flex-1 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            VD: 18 : 00 = 18:00
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={() => onConfirm(shiftType, shiftTime)}
          className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Xác nhận
        </button>
      </div>
    </div>,
    document.body,
  );
}