"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CowLoading from "@/components/cow-loading";
import {
  WAREHOUSE_STATUS_LABELS,
  WAREHOUSE_STATUS_VALUES,
  WAREHOUSE_TYPE_OPTIONS,
  getWarehouseTypeOption,
  type WarehouseItem,
  type WarehouseStatus,
  type WarehouseType,
  type WarehouseZone,
} from "@/lib/warehouse-types";
import WarehouseIcon from "./warehouse-icons";
import styles from "./page.module.css";

type FormState = {
  code: string;
  zoneId: string;
  name: string;
  type: WarehouseType;
  group: string;
  quantity: string;
  unit: string;
  minimumQuantity: string;
  location: string;
  status: WarehouseStatus;
  receivedDate: string;
  expiryDate: string;
  supplier: string;
  manager: string;
  estimatedValue: string;
  note: string;
  metadata: Record<string, string>;
};

type MetadataField = {
  key: string;
  label: string;
  placeholder?: string;
  inputType?: "text" | "number" | "date";
};

const metadataFields: Record<WarehouseType, MetadataField[]> = {
  cong_cu: [
    { key: "condition", label: "Tình trạng", placeholder: "Tốt, cần bảo trì..." },
    { key: "maintenanceDate", label: "Ngày bảo trì", inputType: "date" },
    { key: "usageArea", label: "Khu dùng chính", placeholder: "Chuồng bò, nhà kính..." },
  ],
  hoa_chat: [
    { key: "alias", label: "Tên rút gọn", placeholder: "Ultravac, ClickX..." },
    { key: "whpDays", label: "WHP (ngày)", inputType: "number" },
    { key: "esiDays", label: "ESI (ngày)", inputType: "number" },
    { key: "unitCount", label: "Số đơn vị", inputType: "number" },
    { key: "volumePerUnit", label: "Dung tích mỗi đơn vị", inputType: "number" },
    { key: "unitCost", label: "Đơn giá", inputType: "number" },
    { key: "batchNumber", label: "Số lô" },
    { key: "manufactureDate", label: "Ngày sản xuất", inputType: "date" },
  ],
  thuc_an: [
    { key: "feedTarget", label: "Vật nuôi sử dụng", placeholder: "Bò sữa, heo thịt..." },
    { key: "batchCode", label: "Lô sản xuất", placeholder: "LOT-..." },
    { key: "proteinPercent", label: "Đạm (%)", inputType: "number" },
  ],
  thanh_pham_vat_nuoi: [
    { key: "productBatch", label: "Lô thành phẩm", placeholder: "TP-..." },
    { key: "storageTemperature", label: "Nhiệt độ lưu", placeholder: "2-8 C, đông lạnh..." },
    { key: "traceCode", label: "Mã truy xuất", placeholder: "QR hoặc lô truy xuất" },
  ],
};

const FIELD_LABELS = {
  default: {
    name: "Tên vật tư / thành phẩm",
    group: "Nhóm hàng",
    quantity: "Số lượng",
    unit: "Đơn vị",
    receivedDate: "Ngày nhập",
    expiryDate: "Hạn sử dụng / kiểm định",
    estimatedValue: "Giá trị ước tính",
    note: "Ghi chú",
  },
  hoa_chat: {
    name: "Tên sản phẩm hóa chất",
    group: "Phân loại sản phẩm",
    quantity: "Tổng dung tích",
    unit: "Đơn vị dung tích",
    receivedDate: "Ngày mua",
    expiryDate: "Ngày hết hạn",
    estimatedValue: "Tổng chi phí",
    note: "Mô tả",
  },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeInitialForm(zones: WarehouseZone[], type: WarehouseType = zones[0]?.warehouseTypes[0] ?? "cong_cu"): FormState {
  const typeOption = getWarehouseTypeOption(type);
  return {
    code: "",
    zoneId: zones[0]?.id ?? "",
    name: "",
    type,
    group: "",
    quantity: "",
    unit: typeOption.defaultUnit,
    minimumQuantity: "",
    location: zones[0]?.name ?? "",
    status: "binh_thuong",
    receivedDate: today(),
    expiryDate: "",
    supplier: "",
    manager: "",
    estimatedValue: "",
    note: "",
    metadata: {},
  };
}

function itemToForm(item: WarehouseItem): FormState {
  return {
    code: item.code,
    zoneId: item.zoneId ?? "",
    name: item.name,
    type: item.type,
    group: item.group ?? "",
    quantity: String(item.quantity),
    unit: item.unit,
    minimumQuantity: String(item.minimumQuantity),
    location: item.location ?? item.zoneName ?? "",
    status: item.status,
    receivedDate: item.receivedDate ?? "",
    expiryDate: item.expiryDate ?? "",
    supplier: item.supplier ?? "",
    manager: item.manager ?? "",
    estimatedValue: item.estimatedValue == null ? "" : String(item.estimatedValue),
    note: item.note ?? "",
    metadata: {
      ...Object.entries(item.metadata).reduce<Record<string, string>>((result, [key, value]) => {
        result[key] = value == null ? "" : String(value);
        return result;
      }, {}),
      alias: item.chemicalAlias ?? "",
      whpDays: item.whpDays == null ? "" : String(item.whpDays),
      esiDays: item.esiDays == null ? "" : String(item.esiDays),
      unitCount: item.unitCount == null ? "" : String(item.unitCount),
      volumePerUnit: item.volumePerUnit == null ? "" : String(item.volumePerUnit),
      unitCost: item.unitCost == null ? "" : String(item.unitCost),
      batchNumber: item.batchNumber ?? "",
      manufactureDate: item.manufactureDate ?? "",
    },
  };
}

function makeFormFromItem(item: WarehouseItem, zones: WarehouseZone[]): FormState {
  const form = itemToForm(item);
  if (!form.zoneId) {
    form.zoneId = zones.find((zone) => zone.warehouseTypes.includes(form.type))?.id ?? zones[0]?.id ?? "";
  }
  if (!form.location) {
    form.location = zones.find((zone) => zone.id === form.zoneId)?.name ?? "";
  }
  return form;
}

function cleanMetadata(metadata: Record<string, string>) {
  return Object.entries(metadata).reduce<Record<string, string | null>>((result, [key, value]) => {
    const clean = value.trim();
    result[key] = clean || null;
    return result;
  }, {});
}

function payloadFromForm(form: FormState) {
  const metadata = cleanMetadata(form.metadata);
  if (form.type === "hoa_chat") {
    metadata.productType = form.group.trim() || null;
    metadata.description = form.note.trim() || null;
    metadata.totalVolume = form.quantity.trim() || null;
    metadata.volumeUnit = form.unit.trim() || null;
    metadata.totalCost = form.estimatedValue.trim() || null;
    metadata.purchaseDate = form.receivedDate.trim() || null;
  }
  return { ...form, metadata };
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Không thể lưu dữ liệu kho.");
  return data as { message?: string; item?: WarehouseItem };
}

export default function WarehouseForm({
  item,
  zones,
  onSaved,
}: {
  item?: WarehouseItem | null;
  zones: WarehouseZone[];
  onSaved?: (item: WarehouseItem) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => (item ? makeFormFromItem(item, zones) : makeInitialForm(zones)));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isEdit = Boolean(item?.id);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === form.zoneId) ?? null, [form.zoneId, zones]);
  const availableTypeOptions = useMemo(
    () => (selectedZone && selectedZone.warehouseTypes.length > 0 ? WAREHOUSE_TYPE_OPTIONS.filter((option) => selectedZone.warehouseTypes.includes(option.value)) : WAREHOUSE_TYPE_OPTIONS),
    [selectedZone]
  );
  const activeType = useMemo(() => getWarehouseTypeOption(form.type), [form.type]);
  const labels = form.type === "hoa_chat" ? FIELD_LABELS.hoa_chat : FIELD_LABELS.default;

  const setFormField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeType = (type: WarehouseType) => {
    setForm((current) => {
      const oldDefault = getWarehouseTypeOption(current.type).defaultUnit;
      const nextDefault = getWarehouseTypeOption(type).defaultUnit;
      return {
        ...current,
        type,
        unit: current.unit && current.unit !== oldDefault ? current.unit : nextDefault,
      };
    });
  };

  const changeZone = (zoneId: string) => {
    const nextZone = zones.find((zone) => zone.id === zoneId) ?? null;
    setForm((current) => {
      const nextType = nextZone?.warehouseTypes.includes(current.type) ? current.type : nextZone?.warehouseTypes[0] ?? current.type;
      const nextDefault = getWarehouseTypeOption(nextType).defaultUnit;
      return {
        ...current,
        zoneId,
        type: nextType,
        location: nextZone?.name ?? current.location,
        unit: current.unit ? current.unit : nextDefault,
      };
    });
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (zones.length === 0) throw new Error("Vui lòng thiết lập khu vực dành cho kho trước.");
      if (!form.zoneId) throw new Error("Vui lòng chọn khu vực kho.");
      const response = await fetch(isEdit ? `/api/du-lieu/kho/${item?.id}` : "/api/du-lieu/kho", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(form)),
      });
      const data = await readApiResponse(response);
      if (!data.item) throw new Error("API không trả về vật tư kho.");

      setMessage(data.message ?? "Đã lưu dữ liệu kho.");
      setForm(itemToForm(data.item));
      onSaved?.(data.item);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu dữ liệu kho.");
    } finally {
      setSubmitting(false);
    }
  };

  if (zones.length === 0) {
    return (
      <section className={styles.setupNotice}>
        <div>
          <p className={styles.eyebrow}>Chưa có khu vực kho</p>
          <h2>Vui lòng thiết lập khu vực dành cho kho.</h2>
          <p>Vào Quản lý khu vực, tạo khu vực mới với loại Kho, sau đó tick loại kho được phép lưu trữ.</p>
        </div>
        <Link href="/dashboard/khu-vuc/tao-moi" className={styles.primaryButton}>
          Tạo khu vực kho
        </Link>
      </section>
    );
  }

  return (
    <form className={styles.formPanel} onSubmit={submitForm}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>{isEdit ? "Sửa danh mục" : "Thêm danh mục"}</p>
          <h2>{activeType.shortLabel}</h2>
        </div>
      </div>

      <label className={styles.field}>
        <span>Khu vực kho</span>
        <select value={form.zoneId} onChange={(event) => changeZone(event.target.value)} required>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.segmented} role="group" aria-label="Chọn loại kho">
        {availableTypeOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            className={form.type === option.value ? styles.segmentActive : ""}
            onClick={() => changeType(option.value)}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>{labels.name}</span>
          <input value={form.name} onChange={(event) => setFormField("name", event.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>Mã kho</span>
          <input value={form.code} onChange={(event) => setFormField("code", event.target.value)} placeholder="Tự tạo nếu bỏ trống" />
        </label>
        <label className={styles.field}>
          <span>{labels.group}</span>
          <input value={form.group} onChange={(event) => setFormField("group", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Vị trí lưu trữ</span>
          <select
            value={form.zoneId}
            onChange={(event) => {
              const nextZone = zones.find((zone) => zone.id === event.target.value) ?? null;
              changeZone(event.target.value);
              if (nextZone) setFormField("location", nextZone.name);
            }}
            required
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{labels.quantity}</span>
          <input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => setFormField("quantity", event.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>{labels.unit}</span>
          <input value={form.unit} onChange={(event) => setFormField("unit", event.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>Ngưỡng tối thiểu</span>
          <input type="number" min="0" step="0.01" value={form.minimumQuantity} onChange={(event) => setFormField("minimumQuantity", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Trạng thái</span>
          <select value={form.status} onChange={(event) => setFormField("status", event.target.value as WarehouseStatus)}>
            {WAREHOUSE_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>{WAREHOUSE_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{labels.receivedDate}</span>
          <input type="date" value={form.receivedDate} onChange={(event) => setFormField("receivedDate", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{labels.expiryDate}</span>
          <input type="date" value={form.expiryDate} onChange={(event) => setFormField("expiryDate", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Nhà cung cấp</span>
          <input value={form.supplier} onChange={(event) => setFormField("supplier", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Người phụ trách</span>
          <input value={form.manager} onChange={(event) => setFormField("manager", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{labels.estimatedValue}</span>
          <input type="number" min="0" step="1000" value={form.estimatedValue} onChange={(event) => setFormField("estimatedValue", event.target.value)} />
        </label>

        {metadataFields[form.type].map((field) => (
          <label className={styles.field} key={field.key}>
            <span>{field.label}</span>
            <input
              type={field.inputType ?? "text"}
              value={form.metadata[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  metadata: { ...current.metadata, [field.key]: event.target.value },
                }))
              }
            />
          </label>
        ))}

        <label className={`${styles.field} ${styles.fullField}`}>
          <span>{labels.note}</span>
          <textarea value={form.note} onChange={(event) => setFormField("note", event.target.value)} rows={3} />
        </label>
      </div>

      {message && <p className={styles.formMessage}>{message}</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryButton} disabled={submitting}>
          <span><WarehouseIcon name="save" /></span>
          {submitting ? <CowLoading label="Đang tải..." /> : isEdit ? "Lưu sửa" : "Thêm vào kho"}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => router.push("/dashboard/quan-ly-kho")} disabled={submitting}>
          Về tổng quan
        </button>
      </div>
    </form>
  );
}
