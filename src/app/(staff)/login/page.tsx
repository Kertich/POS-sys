"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ArrowLeft, Delete, Leaf, LockKeyhole } from "lucide-react";
import { usePosStore } from "@/lib/store";

const pinSchema = z.string().regex(/^\d{4}$/, "Enter your 4-digit PIN");
const floatSchema = z.number().int().min(0, "Enter a valid opening float");
const staff = [{ name: "Mary Wanjiku", role: "Shop attendant", emoji: "👩🏾‍🌾" }, { name: "James Otieno", role: "Cashier", emoji: "👨🏿‍💼" }, { name: "Amina Hassan", role: "Shop attendant", emoji: "👩🏽‍🦱" }];

export default function LoginPage() {
  const t = useTranslations();
  const [selected, setSelected] = useState(staff[0]);
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"pin" | "float">("pin");
  const [floatValue, setFloatValue] = useState("");
  const [error, setError] = useState("");
  const startShift = usePosStore((state) => state.startShift);

  function press(key: string) {
    setError("");
    if (key === "delete") { setPin((value) => value.slice(0, -1)); return; }
    if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      if (next.length === 4) {
        const valid = pinSchema.safeParse(next);
        window.setTimeout(() => valid.success ? setStep("float") : setError(t("pinError")), 100);
      }
    }
  }

  function beginShift() {
    const amount = Number(floatValue);
    const valid = floatSchema.safeParse(amount);
    if (!valid.success) { setError(t("floatError")); return; }
    startShift(selected.name.split(" ")[0], amount);
    window.location.href = "/home";
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-60px)] max-w-md flex-col bg-[var(--background)] px-5 py-5">
      <Link href="/home" className="flex min-h-12 items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={18} /> {t("back")}</Link>
      {step === "pin" ? <>
        <div className="mt-7"><h1 className="text-center text-2xl font-extrabold">{t("userOnTill")}</h1><p className="mt-1 text-center text-sm text-[var(--muted)]">{t("chooseProfile")}</p></div>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {staff.map((person) => <button key={person.name} onClick={() => setSelected(person)} className={`flex min-w-[105px] flex-col items-center rounded-2xl border-2 p-3 ${selected.name === person.name ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] bg-white"}`}><span className="text-3xl">{person.emoji}</span><span className="mt-2 text-xs font-extrabold">{person.name.split(" ")[0]}</span></button>)}
        </div>
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-4">
          <div className="flex items-center justify-center gap-2 text-sm font-bold"><LockKeyhole size={17} /> {t("enterPin")}</div>
          <div className="my-4 flex justify-center gap-4" aria-label={`${pin.length} of 4 digits entered`}>{[0, 1, 2, 3].map((index) => <span key={index} className={`size-4 rounded-full border-2 ${pin.length > index ? "border-[var(--primary)] bg-[var(--primary)]" : "border-gray-300"}`} />)}</div>
          {error && <p role="alert" className="mb-2 text-center text-sm font-bold text-red-700">{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, index) => key ? <button key={index} onClick={() => press(key)} className="min-h-[54px] rounded-xl bg-[#f2f5f2] text-xl font-extrabold active:bg-[var(--primary-soft)]">{key === "delete" ? <span className="flex items-center justify-center gap-1 text-sm"><Delete size={18} /> {t("delete")}</span> : key}</button> : <span key={index} />)}
          </div>
          <p className="mt-3 text-center text-xs text-[var(--muted)]">{t("demoPin")}</p>
        </div>
      </> : <>
        <div className="mt-10"><h1 className="text-center text-2xl font-extrabold">{t("openingFloat")}</h1><p className="mt-2 text-center text-sm text-[var(--muted)]">{t("floatQuestion")}</p></div>
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5">
          <label htmlFor="float" className="text-sm font-bold">{t("cashInDrawer")}</label>
          <div className="mt-2 flex h-16 items-center rounded-xl border-2 border-[var(--primary)] px-4"><span className="mr-3 font-bold text-[var(--muted)]">KES</span><input id="float" type="number" inputMode="numeric" min="0" placeholder="2,000" value={floatValue} onChange={(event) => setFloatValue(event.target.value)} className="w-full bg-transparent text-2xl font-extrabold outline-none" autoFocus /></div>
          {error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}
          <button onClick={beginShift} className="mt-5 min-h-14 w-full rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white">{t("startShift")}</button>
          <button onClick={() => { setStep("pin"); setPin(""); setError(""); }} className="mt-2 min-h-12 w-full rounded-xl font-bold text-[var(--muted)]">{t("goBack")}</button>
        </div>
      </>}
    </div>
  );
}
