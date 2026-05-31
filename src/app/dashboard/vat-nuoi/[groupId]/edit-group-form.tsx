"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LivestockDetail } from "@/lib/livestock-detail";
import styles from "../new-group-wizard.module.css";

type FormState = {
  groupName: string;
  description: string;
  breed: string;
  gender: string;
  lifeStage: string;
  healthStatus: string;
  purpose: string;
  herdNotes: string;
  origin: string;
  price: string;
  expenseAccount: string;
  birthDate: string;
  conceptionType: string;
  averageBirthWeight: string;
  birthNotes: string;
  healthIssues: string;
  maternityId: string;
  paternityId: string;
  colouring: string;
  eyeColor: string;
  earType: string;
  hornType: string;
  mouth: string;
  bodyConditionScore: string;
  traitNotes: string;
  reproductiveState: string;
  reproductiveAvailability: string;
  lifetimeAdg: string;
  lifetimeMjDay: string;
  targetLiveWeight: string;
  targetWeightDate: string;
};

type StepKey = "profile" | "herd" | "origin" | "traits" | "production";

const steps: Array<{ key: StepKey; title: string; desc: string; icon: string; items: string[] }> = [
  {
    key: "profile",
    title: "Hồ sơ nhóm",
    desc: "Cập nhật tên, giống và mô tả vận hành của nhóm.",
    icon: "info",
    items: ["Tên nhóm", "Giống", "Mô tả"],
  },
  {
    key: "herd",
    title: "Phân loại",
    desc: "Cập nhật giới tính, giai đoạn, trạng thái sức khỏe và mục đích nuôi.",
    icon: "list",
    items: ["Giới tính", "Giai đoạn", "Sức khỏe", "Mục đích", "Ghi chú đàn"],
  },
  {
    key: "origin",
    title: "Nguồn gốc",
    desc: "Cập nhật thông tin nhập đàn, bố mẹ và ghi chú sức khỏe ban đầu.",
    icon: "origin",
    items: ["Nguồn gốc", "Giá trị", "Ngày sinh/nhập", "Bố mẹ", "Sức khỏe"],
  },
  {
    key: "traits",
    title: "Đặc điểm",
    desc: "Cập nhật đặc điểm nhận dạng và điểm thể trạng nhóm.",
    icon: "traits",
    items: ["Màu sắc", "Mắt", "Tai", "Sừng", "Thể trạng"],
  },
  {
    key: "production",
    title: "Sản xuất",
    desc: "Cập nhật tình trạng sinh sản và mục tiêu tăng trọng.",
    icon: "production",
    items: ["Sinh sản", "Tăng trọng", "Năng lượng", "Mục tiêu"],
  },
];

const healthOptions = ["Đang hoạt động", "Cần theo dõi", "Cách ly", "Ngừng theo dõi"];
const genderOptions = ["Cái", "Đực", "Thiến", "Trống", "Mái", "Hỗn hợp", "Chưa xác định"];
const lifeStageOptions = ["Con non", "Tơ", "Trưởng thành", "Vỗ béo", "Sinh sản", "Hậu bị", "Thịt", "Chưa xác định"];
const purposeOptions = ["Thịt", "Sữa", "Sinh sản", "Nuôi hậu bị", "Khai thác giống", "Đẻ trứng", "Thương phẩm"];
const expenseOptions = ["Vật nuôi", "Con giống", "Thức ăn", "Thú y", "Vận chuyển"];
const conceptionOptions = ["Phối giống tự nhiên", "Thụ tinh nhân tạo", "Sinh sản nhân tạo", "Không áp dụng", "Chưa xác định"];
const reproductionOptions = ["Chưa xác định", "Không mang thai", "Đang mang thai", "Đang nuôi con", "Không áp dụng"];
const reproductiveAvailabilityOptions = ["Chưa xác định", "Có thể phối giống", "Tạm ngưng", "Không áp dụng"];

function text(value: unknown) {
  return String(value ?? "");
}

function numberText(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "" : String(value);
}

function dateText(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function makeInitialForm(group: LivestockDetail["group"]): FormState {
  return {
    groupName: text(group.name),
    description: text(group.description),
    breed: text(group.breed),
    gender: text(group.gender),
    lifeStage: text(group.lifeStage),
    healthStatus: text(group.healthStatus),
    purpose: text(group.purpose),
    herdNotes: text(group.herdNotes),
    origin: text(group.origin),
    price: numberText(group.price),
    expenseAccount: text(group.expenseAccount),
    birthDate: dateText(group.birthDate),
    conceptionType: text(group.conceptionType),
    averageBirthWeight: numberText(group.averageBirthWeight),
    birthNotes: text(group.birthNotes),
    healthIssues: text(group.healthIssues),
    maternityId: text(group.maternityId),
    paternityId: text(group.paternityId),
    colouring: text(group.colouring),
    eyeColor: text(group.eyeColor),
    earType: text(group.earType),
    hornType: text(group.hornType),
    mouth: text(group.mouth),
    bodyConditionScore: numberText(group.bodyConditionScore),
    traitNotes: text(group.traitNotes),
    reproductiveState: text(group.reproductiveState),
    reproductiveAvailability: text(group.reproductiveAvailability),
    lifetimeAdg: numberText(group.lifetimeAdg),
    lifetimeMjDay: numberText(group.lifetimeMjDay),
    targetLiveWeight: numberText(group.targetLiveWeight),
    targetWeightDate: dateText(group.targetWeightDate),
  };
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case "list":
      return <svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>;
    case "origin":
      return <svg viewBox="0 0 24 24"><path d="M4 19h16" /><path d="M7 19V9l5-4 5 4v10" /><path d="M9 13h6" /></svg>;
    case "traits":
      return <svg viewBox="0 0 24 24"><path d="M5 19c6-1 9-5 9-12" /><path d="M9 12c4 0 7-2 9-6" /><path d="M14 7h5v5" /></svg>;
    case "production":
      return <svg viewBox="0 0 24 24"><path d="M12 21a8 8 0 0 0 8-8c0-5-8-10-8-10S4 8 4 13a8 8 0 0 0 8 8Z" /><path d="M9 13a3 3 0 0 0 6 0" /></svg>;
    case "save":
      return <svg viewBox="0 0 24 24"><path d="M5 5h12l2 2v12H5z" /><path d="M8 5v6h8V5M8 19v-5h8v5" /></svg>;
    case "close":
      return <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>;
    default:
      return <svg viewBox="0 0 24 24"><path d="M12 17v-6" /><path d="M12 7h.01" /><path d="M5 4h14v16H5z" /></svg>;
  }
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const values = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Chưa cập nhật</option>
      {values.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function EditGroupForm({
  open,
  group,
}: {
  open: boolean;
  group: LivestockDetail["group"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(open);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(() => makeInitialForm(group));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVisible(open);
    if (open) {
      setStepIndex(0);
      setError("");
      setForm(makeInitialForm(group));
    }
  }, [group, open]);

  const step = steps[stepIndex];
  const canSave = form.groupName.trim().length > 0 && form.breed.trim().length > 0;
  const lockedItems = useMemo(
    () => [
      `Mã nhóm: ${group.code}`,
      `Loài: ${group.species}`,
      `Số lượng: ${new Intl.NumberFormat("vi-VN").format(group.linkedCount || group.headCount)} con`,
      "QR cá thể: không cấp lại trong màn hình này",
      "Khu vực/chuồng: chỉnh bằng tác vụ di chuyển",
    ],
    [group]
  );

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    setError("");
    router.replace(pathname);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    if (!canSave) {
      setError("Vui lòng nhập tên nhóm và giống trước khi lưu.");
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        const response = await fetch("/api/du-lieu/vat-nuoi/nhom", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: group.id, ...form }),
        });
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          setError(result.message ?? "Không thể cập nhật nhóm vật nuôi.");
          return;
        }
        setVisible(false);
        router.replace(pathname);
        router.refresh();
      } catch {
        setError("Không thể kết nối tới máy chủ để cập nhật nhóm vật nuôi.");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="edit-group-title">
      <section className={styles.modal}>
        <aside className={styles.sidebar}>
          <div className={styles.photo}>
            <div className={styles.photoArt}>
              <span className={styles.photoHalo} />
              <span className={styles.photoIcon}><Icon name="info" /></span>
              <strong>{group.species}</strong>
              <small>{group.code}</small>
            </div>
          </div>
          <nav className={styles.stepNav} aria-label="Các phần chỉnh sửa nhóm vật nuôi">
            {steps.map((item, index) => (
              <button
                type="button"
                key={item.key}
                className={`${styles.stepButton} ${index === stepIndex ? styles.stepButtonActive : ""}`}
                onClick={() => setStepIndex(index)}
              >
                <span><Icon name={item.icon} /></span>
                {item.title}
              </button>
            ))}
          </nav>
          <ul className={styles.subNav}>
            {step.items.map((item) => <li key={item}>{item}</li>)}
            {lockedItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </aside>

        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              <span><Icon name={step.icon} /></span>
              <div>
                <h2 id="edit-group-title">{step.title}</h2>
                <p>{step.desc}</p>
              </div>
            </div>
            <button type="button" className={styles.closeButton} onClick={close} aria-label="Đóng">
              <Icon name="close" />
            </button>
          </header>

          <div className={styles.body}>
            {step.key === "profile" && (
              <>
                <p className={styles.helperText}>
                  Mã nhóm, loài, số lượng cá thể và QR không chỉnh tại đây để giữ lịch sử truy xuất ổn định.
                </p>
                <Field label="Mã nhóm">
                  <input value={group.code} readOnly />
                </Field>
                <Field label="Loài vật nuôi">
                  <input value={group.species} readOnly />
                </Field>
                <Field label="Tên nhóm" required>
                  <input value={form.groupName} onChange={(event) => update("groupName", event.target.value)} />
                </Field>
                <Field label="Giống" required>
                  <input value={form.breed} onChange={(event) => update("breed", event.target.value)} />
                </Field>
                <Field label="Mô tả">
                  <textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
                </Field>
              </>
            )}

            {step.key === "herd" && (
              <>
                <Field label="Giới tính">
                  <Select value={form.gender} options={genderOptions} onChange={(value) => update("gender", value)} />
                </Field>
                <Field label="Giai đoạn sinh trưởng">
                  <Select value={form.lifeStage} options={lifeStageOptions} onChange={(value) => update("lifeStage", value)} />
                </Field>
                <Field label="Sức khỏe/trạng thái">
                  <Select value={form.healthStatus} options={healthOptions} onChange={(value) => update("healthStatus", value)} />
                </Field>
                <Field label="Mục đích/kiểu sản xuất">
                  <Select value={form.purpose} options={purposeOptions} onChange={(value) => update("purpose", value)} />
                </Field>
                <Field label="Ghi chú đàn">
                  <textarea value={form.herdNotes} onChange={(event) => update("herdNotes", event.target.value)} />
                </Field>
              </>
            )}

            {step.key === "origin" && (
              <>
                <Field label="Nguồn gốc">
                  <input value={form.origin} onChange={(event) => update("origin", event.target.value)} />
                </Field>
                <Field label="Giá trị">
                  <div className={styles.inputGroup}>
                    <span>VND</span>
                    <input value={form.price} onChange={(event) => update("price", event.target.value)} />
                  </div>
                </Field>
                <Field label="Tài khoản chi phí">
                  <Select value={form.expenseAccount} options={expenseOptions} onChange={(value) => update("expenseAccount", value)} />
                </Field>
                <Field label="Ngày sinh/ngày nhập">
                  <input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} />
                </Field>
                <Field label="Kiểu phối giống">
                  <Select value={form.conceptionType} options={conceptionOptions} onChange={(value) => update("conceptionType", value)} />
                </Field>
                <Field label="Khối lượng sơ sinh trung bình">
                  <div className={styles.inputGroup}>
                    <input value={form.averageBirthWeight} onChange={(event) => update("averageBirthWeight", event.target.value)} />
                    <span>kg</span>
                  </div>
                </Field>
                <Field label="Ghi chú sinh/nhập đàn">
                  <textarea value={form.birthNotes} onChange={(event) => update("birthNotes", event.target.value)} />
                </Field>
                <Field label="Vấn đề sức khỏe">
                  <textarea value={form.healthIssues} onChange={(event) => update("healthIssues", event.target.value)} />
                </Field>
                <Field label="Mã mẹ">
                  <input value={form.maternityId} onChange={(event) => update("maternityId", event.target.value)} />
                </Field>
                <Field label="Mã bố">
                  <input value={form.paternityId} onChange={(event) => update("paternityId", event.target.value)} />
                </Field>
              </>
            )}

            {step.key === "traits" && (
              <>
                <Field label="Màu sắc">
                  <textarea value={form.colouring} onChange={(event) => update("colouring", event.target.value)} />
                </Field>
                <Field label="Màu mắt">
                  <input value={form.eyeColor} onChange={(event) => update("eyeColor", event.target.value)} />
                </Field>
                <Field label="Kiểu tai">
                  <input value={form.earType} onChange={(event) => update("earType", event.target.value)} />
                </Field>
                <Field label="Kiểu sừng">
                  <input value={form.hornType} onChange={(event) => update("hornType", event.target.value)} />
                </Field>
                <Field label="Miệng">
                  <input value={form.mouth} onChange={(event) => update("mouth", event.target.value)} />
                </Field>
                <Field label="Điểm thể trạng">
                  <input value={form.bodyConditionScore} onChange={(event) => update("bodyConditionScore", event.target.value)} />
                </Field>
                <Field label="Ghi chú đặc điểm">
                  <textarea value={form.traitNotes} onChange={(event) => update("traitNotes", event.target.value)} />
                </Field>
              </>
            )}

            {step.key === "production" && (
              <>
                <Field label="Tình trạng sinh sản">
                  <Select value={form.reproductiveState} options={reproductionOptions} onChange={(value) => update("reproductiveState", value)} />
                </Field>
                <Field label="Khả dụng sinh sản">
                  <Select value={form.reproductiveAvailability} options={reproductiveAvailabilityOptions} onChange={(value) => update("reproductiveAvailability", value)} />
                </Field>
                <Field label="Tăng trọng bình quân">
                  <div className={styles.inputGroup}>
                    <input value={form.lifetimeAdg} onChange={(event) => update("lifetimeAdg", event.target.value)} />
                    <span>kg/ngày</span>
                  </div>
                </Field>
                <Field label="Năng lượng/ngày">
                  <div className={styles.inputGroup}>
                    <input value={form.lifetimeMjDay} onChange={(event) => update("lifetimeMjDay", event.target.value)} />
                    <span>MJ/ngày</span>
                  </div>
                </Field>
                <Field label="Khối lượng mục tiêu">
                  <div className={styles.inputGroup}>
                    <input value={form.targetLiveWeight} onChange={(event) => update("targetLiveWeight", event.target.value)} />
                    <span>kg</span>
                  </div>
                </Field>
                <Field label="Ngày đạt mục tiêu">
                  <input type="date" value={form.targetWeightDate} onChange={(event) => update("targetWeightDate", event.target.value)} />
                </Field>
              </>
            )}
          </div>

          <footer className={styles.footer}>
            <div className={styles.navButtons}>
              <button type="button" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0 || saving}>
                <span>‹</span> Quay lại
              </button>
              <button type="button" onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))} disabled={stepIndex === steps.length - 1 || saving}>
                Tiếp tục <span>›</span>
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actionButtons}>
              <button type="button" className={styles.saveButton} onClick={save} disabled={!canSave || saving}>
                <Icon name="save" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button type="button" className={styles.cancelButton} onClick={close} disabled={saving}>
                <Icon name="close" />
                Hủy
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
