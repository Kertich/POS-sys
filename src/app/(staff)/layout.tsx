import { StaffShell } from "@/components/staff-shell";

export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StaffShell>{children}</StaffShell>;
}
