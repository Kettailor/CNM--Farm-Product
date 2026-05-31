"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";
import CowLoading from "@/components/cow-loading";
import {
  LIVESTOCK_TREATMENT_TYPE_OPTIONS,
  getLivestockTreatmentTypeOption,
  type LivestockTreatmentMetadataField,
  type LivestockTreatmentType,
} from "@/lib/livestock-treatment-types";
import type { LivestockTreatmentRecord, TreatmentWarehouseItem } from "@/lib/livestock-treatment-data";
import styles from "./page.module.css";

type AnimalOption = {
  id: string;
  code: string | null;
  qrCode: string | null;
  identity: string | null;
  status: string | null;
};

type FormState = {
  type: LivestockTreatmentType;
  name: string;
  warehouseItemId: string;
  selectedAnimalIds: string[];
  treatedCount: string;
  treatmentDate: string;
  dosePerAnimal: string;
  doseUnit: string;
  totalQuantity: string;
  batchLot: string;
  method: string;
  performedBy: string;
  withdrawalDays: string;
  esiDays: string;
  nextDueDate: string;
  note: string;
  metadata: Record<string, string>;
};

type AttachmentImage = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

const MAX_ATTACHMENT_IMAGES = 4;
const MAX_ATTACHMENT_IMAGE_SIZE = 3 * 1024 * 1024;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numeric(value: string) {
  const parsed = Number(value.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    binh_thuong: "Bình thường",
    sap_het: "Sắp hết",
    can_kiem_tra: "Cần kiểm tra",
    het_han: "Hết hạn",
    ngung_su_dung: "Ngừng sử dụng",
    da_huy: "Đã hủy",
  };
  return labels[status] ?? status;
}

function findFirstItemForType(type: LivestockTreatmentType, items: TreatmentWarehouseItem[]) {
  const option = getLivestockTreatmentTypeOption(type);
  return items.find((item) => option.allowedWarehouseTypes.includes(item.type)) ?? null;
}

function initialForm(items: TreatmentWarehouseItem[], headCount: number): FormState {
  const type = "footrot";
  const option = getLivestockTreatmentTypeOption(type);
  const item = findFirstItemForType(type, items);
  return {
    type,
    name: item ? `${option.shortLabel} - ${item.name}` : "",
    warehouseItemId: item?.id ?? "",
    selectedAnimalIds: [],
    treatedCount: String(Math.max(headCount, 0)),
    treatmentDate: today(),
    dosePerAnimal: "",
    doseUnit: item ? `${item.unit}/con` : option.defaultDoseUnit,
    totalQuantity: "",
    batchLot: item?.batchLot ?? "",
    method: option.defaultMethod,
    performedBy: "",
    withdrawalDays: "",
    esiDays: "",
    nextDueDate: "",
    note: "",
    metadata: {},
  };
}

type CameraConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
  zoom?: number;
};

function normalizeScannedText(value: string) {
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

function findAnimalFromScannedText(rawValue: string, animals: AnimalOption[]) {
  const scanned = normalizeScannedText(rawValue);
  const candidates = new Set<string>([scanned]);
  const qrMatch = scanned.match(/QR-VN-[A-Z0-9-]+/i);
  const animalCodeMatch = scanned.match(/NVN-[A-Z0-9-]+/i);
  if (qrMatch?.[0]) candidates.add(qrMatch[0].toUpperCase());
  if (animalCodeMatch?.[0]) candidates.add(animalCodeMatch[0].toUpperCase());

  return animals.find((animal) => {
    const values = [animal.qrCode, animal.code, animal.identity]
      .filter((item): item is string => Boolean(item))
      .map((item) => item.trim());
    return values.some((value) => candidates.has(value) || scanned.includes(value));
  }) ?? null;
}

function beep() {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const audio = new AudioContextCtor();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, audio.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.18);
}

function decodeQrImage(data: Uint8ClampedArray, width: number, height: number) {
  return jsQR(data, width, height, { inversionAttempts: "attemptBoth" })?.data?.trim() ?? null;
}

function thresholdImage(data: Uint8ClampedArray, threshold: number) {
  const result = new Uint8ClampedArray(data);
  for (let index = 0; index < result.length; index += 4) {
    const gray = result[index] * 0.299 + result[index + 1] * 0.587 + result[index + 2] * 0.114;
    const value = gray > threshold ? 255 : 0;
    result[index] = value;
    result[index + 1] = value;
    result[index + 2] = value;
    result[index + 3] = 255;
  }
  return result;
}

function decodeQrImageVariants(data: Uint8ClampedArray, width: number, height: number) {
  const direct = decodeQrImage(data, width, height);
  if (direct) return direct;

  for (const threshold of [96, 120, 144, 168]) {
    const result = decodeQrImage(thresholdImage(data, threshold), width, height);
    if (result) return result;
  }

  return null;
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Không thể ghi nhận điều trị.");
  return data as { message?: string; remainingQuantity?: number; inventoryDeducted?: boolean };
}

function metadataPayload(metadata: Record<string, string>) {
  return Object.entries(metadata).reduce<Record<string, string | null>>((result, [key, value]) => {
    const clean = value.trim();
    result[key] = clean || null;
    return result;
  }, {});
}

function readImageFile(file: File) {
  return new Promise<AttachmentImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Không thể đọc ảnh đính kèm."));
        return;
      }
      resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
    };
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đính kèm."));
    reader.readAsDataURL(file);
  });
}

function attachmentCount(metadata: LivestockTreatmentRecord["metadata"]) {
  const attachments = metadata.attachments;
  return Array.isArray(attachments) ? attachments.length : 0;
}

export default function TreatmentForm({
  groupId,
  groupName,
  headCount,
  animals,
  warehouseItems,
  recentTreatments,
  closeHref = `/dashboard/vat-nuoi/${groupId}`,
}: {
  groupId: string;
  groupName: string;
  headCount: number;
  animals: AnimalOption[];
  warehouseItems: TreatmentWarehouseItem[];
  recentTreatments: LivestockTreatmentRecord[];
  closeHref?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialForm(warehouseItems, headCount));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [attachmentImages, setAttachmentImages] = useState<AttachmentImage[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const recentScanRef = useRef<{ value: string; at: number } | null>(null);

  const typeOption = useMemo(() => getLivestockTreatmentTypeOption(form.type), [form.type]);
  const availableItems = useMemo(
    () => warehouseItems.filter((item) => typeOption.allowedWarehouseTypes.includes(item.type)),
    [typeOption, warehouseItems]
  );
  const selectedItem = useMemo(
    () => warehouseItems.find((item) => item.id === form.warehouseItemId) ?? null,
    [form.warehouseItemId, warehouseItems]
  );
  const effectiveCount = form.selectedAnimalIds.length;
  const suggestedTotal = numeric(form.dosePerAnimal) > 0 && effectiveCount > 0 ? numeric(form.dosePerAnimal) * effectiveCount : 0;
  const submittedTotal = numeric(form.totalQuantity) > 0 ? numeric(form.totalQuantity) : suggestedTotal;
  const remainingAfter = selectedItem ? selectedItem.quantity - submittedTotal : 0;
  const canDeduct = selectedItem?.type !== "cong_cu";
  const allAnimalIds = useMemo(() => animals.map((animal) => animal.id), [animals]);
  const selectedAnimals = useMemo(
    () => animals.filter((animal) => form.selectedAnimalIds.includes(animal.id)),
    [animals, form.selectedAnimalIds]
  );

  const stopQrScanner = useCallback(() => {
    if (scanLoopRef.current != null) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    recentScanRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerActive(false);
    setScannerOpen(false);
  }, []);

  useEffect(() => stopQrScanner, [stopQrScanner]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setMetadata = (key: string, value: string) => {
    setForm((current) => ({ ...current, metadata: { ...current.metadata, [key]: value } }));
  };

  const applyWarehouseDefaults = (
    item: TreatmentWarehouseItem | null,
    option = typeOption,
    current: FormState
  ): FormState => ({
    ...current,
    warehouseItemId: item?.id ?? "",
    name: item ? `${option.shortLabel} - ${item.name}` : current.name,
    doseUnit: item ? `${item.unit}/con` : option.defaultDoseUnit,
    batchLot: item?.batchLot ?? "",
    method: option.defaultMethod,
  });

  const changeType = (type: LivestockTreatmentType) => {
    const option = getLivestockTreatmentTypeOption(type);
    const item = findFirstItemForType(type, warehouseItems);
    setMessage(null);
    setForm((current) => ({
      ...applyWarehouseDefaults(item, option, current),
      type,
      metadata: {},
    }));
    if (!item) setMessage("Chưa có vật tư phù hợp trong kho. Hãy tạo mới vật tư từ kho trước khi lưu điều trị.");
  };

  const changeWarehouseItem = (itemId: string) => {
    const item = warehouseItems.find((entry) => entry.id === itemId) ?? null;
    setMessage(null);
    setForm((current) => applyWarehouseDefaults(item, typeOption, { ...current, warehouseItemId: itemId }));
  };

  const toggleAnimal = (animalId: string) => {
    setForm((current) => {
      const exists = current.selectedAnimalIds.includes(animalId);
      return {
        ...current,
        selectedAnimalIds: exists
          ? current.selectedAnimalIds.filter((item) => item !== animalId)
          : [...current.selectedAnimalIds, animalId],
        treatedCount: String(exists ? current.selectedAnimalIds.length - 1 : current.selectedAnimalIds.length + 1),
      };
    });
  };

  const selectAllAnimals = () => {
    setQrMessage(null);
    setForm((current) => ({ ...current, selectedAnimalIds: allAnimalIds, treatedCount: String(allAnimalIds.length) }));
  };

  const clearSelectedAnimals = () => {
    setQrMessage(null);
    setForm((current) => ({ ...current, selectedAnimalIds: [], treatedCount: "0" }));
  };

  const changeAttachmentImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setMessage(null);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, MAX_ATTACHMENT_IMAGES - attachmentImages.length);
    if (remainingSlots === 0) {
      setMessage(`Chỉ tải tối đa ${MAX_ATTACHMENT_IMAGES} ảnh cho một bản ghi điều trị.`);
      return;
    }

    const accepted = files.slice(0, remainingSlots).filter((file) => file.type.startsWith("image/") && file.size <= MAX_ATTACHMENT_IMAGE_SIZE);
    const rejectedCount = files.length - accepted.length;
    if (accepted.length === 0) {
      setMessage("Ảnh đính kèm phải là file ảnh và không vượt quá 3MB/file.");
      return;
    }

    try {
      const images = await Promise.all(accepted.map(readImageFile));
      setAttachmentImages((current) => [...current, ...images].slice(0, MAX_ATTACHMENT_IMAGES));
      if (rejectedCount > 0) setMessage("Một số ảnh không được thêm vì sai định dạng, vượt quá 3MB/file hoặc quá số lượng cho phép.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc ảnh đính kèm.");
    }
  };

  const removeAttachmentImage = (index: number) => {
    setAttachmentImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const selectAnimalByCode = useCallback((rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    const recent = recentScanRef.current;
    const now = Date.now();
    if (recent?.value === code && now - recent.at < 1500) return;
    recentScanRef.current = { value: code, at: now };

    const animal = findAnimalFromScannedText(code, animals);
    if (!animal) {
      setQrMessage(`Đã đọc mã "${code}" nhưng không tìm thấy vật nuôi tương ứng trong đàn này.`);
      return;
    }

    setForm((current) => {
      if (current.selectedAnimalIds.includes(animal.id)) return current;
      const selectedAnimalIds = [...current.selectedAnimalIds, animal.id];
      return { ...current, selectedAnimalIds, treatedCount: String(selectedAnimalIds.length) };
    });
    beep();
    setQrMessage(`Đã chọn ${animal.code || animal.qrCode || code}.`);
  }, [animals]);

  const scanManualQr = () => {
    selectAnimalByCode(qrInput);
    setQrInput("");
  };

  const decodeFromVideo = useCallback((video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!canvas || width <= 0 || height <= 0) return null;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const fullResult = decodeQrImageVariants(context.getImageData(0, 0, width, height).data, width, height);
    if (fullResult) return fullResult;

    const scanCanvas = scanCanvasRef.current ?? document.createElement("canvas");
    scanCanvasRef.current = scanCanvas;
    const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
    if (!scanContext) return null;

    const crops = [0.92, 0.78, 0.64, 0.5];
    const baseSide = Math.min(width, height);

    for (const ratio of crops) {
      const side = Math.floor(baseSide * ratio);
      if (side < 80) continue;
      const left = Math.max(0, Math.floor((width - side) / 2));
      const top = Math.max(0, Math.floor((height - side) / 2));
      const outputSize = Math.max(420, Math.min(900, side * 3));
      scanCanvas.width = outputSize;
      scanCanvas.height = outputSize;
      scanContext.imageSmoothingEnabled = false;
      scanContext.drawImage(canvas, left, top, side, side, 0, 0, outputSize, outputSize);
      const imageData = scanContext.getImageData(0, 0, outputSize, outputSize);
      const result = decodeQrImageVariants(imageData.data, outputSize, outputSize);
      if (result) return result;
    }

    return null;
  }, []);

  const startQrScanner = () => {
    setQrMessage(null);
    setScannerOpen(true);
  };

  useEffect(() => {
    if (!scannerOpen || scannerActive || zxingControlsRef.current) return;

    let cancelled = false;

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrMessage("Trình duyệt không cho phép mở camera. Bạn có thể nhập mã QR thủ công.");
        return;
      }

      try {
        if (!videoRef.current) {
          setQrMessage("Không tìm thấy khung camera. Vui lòng tắt rồi bật lại quét QR.");
          return;
        }

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 60,
          delayBetweenScanSuccess: 250,
          tryPlayVideoTimeout: 5000,
        });

        setQrMessage("Camera đang quét mã QR...");
        const controls = await reader.decodeFromConstraints(
          {
            video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
            const rawValue = result?.getText()?.trim();
            if (!rawValue) return;
            selectAnimalByCode(rawValue);
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        zxingControlsRef.current = controls;
        setScannerActive(true);
        try {
          controls.streamVideoConstraintsApply?.({
            advanced: [
              { focusMode: "continuous" } as CameraConstraintSet,
              { exposureMode: "continuous" } as CameraConstraintSet,
              { whiteBalanceMode: "continuous" } as CameraConstraintSet,
              { zoom: 2 } as CameraConstraintSet,
            ],
          });
        } catch {
          // Some webviews reject optional camera constraints even when scanning works.
        }

      const scanFrame = async () => {
          if (cancelled || !videoRef.current || !zxingControlsRef.current) return;
          const video = videoRef.current;
          const rawValue = decodeFromVideo(video);
          if (rawValue) {
            selectAnimalByCode(rawValue);
            return;
          }

        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      };
      scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      } catch {
      setScannerActive(false);
      setQrMessage("Không mở được camera. Vui lòng cấp quyền camera hoặc nhập mã QR thủ công.");
    }
    };

    void openCamera();

    return () => {
      cancelled = true;
    };
  }, [decodeFromVideo, scannerActive, scannerOpen, selectAnimalByCode, stopQrScanner]);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!form.warehouseItemId) throw new Error("Vui lòng chọn vật tư điều trị từ kho.");
      if (form.selectedAnimalIds.length < 1) throw new Error("Vui lòng chọn ít nhất một vật nuôi trong đàn để ghi điều trị.");
      if (canDeduct && submittedTotal <= 0) throw new Error("Vui lòng nhập liều hoặc tổng lượng vật tư dùng.");
      if (canDeduct && selectedItem && submittedTotal > selectedItem.quantity) throw new Error("Tồn kho không đủ cho lần điều trị này.");

      const response = await fetch("/api/du-lieu/vat-nuoi/dieu-tri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          type: form.type,
          name: form.name,
          warehouseItemId: form.warehouseItemId,
          animalIds: form.selectedAnimalIds,
          treatedCount: effectiveCount,
          treatmentDate: form.treatmentDate,
          dosePerAnimal: form.dosePerAnimal,
          doseUnit: form.doseUnit,
          totalQuantity: submittedTotal,
          batchLot: form.batchLot,
          method: form.method,
          performedBy: form.performedBy,
          withdrawalDays: form.withdrawalDays,
          esiDays: form.esiDays,
          nextDueDate: form.nextDueDate,
          note: form.note,
          metadata: metadataPayload(form.metadata),
          attachmentImages,
        }),
      });
      const data = await readApiResponse(response);
      const restockText = data.inventoryDeducted === false ? " Vật tư công cụ được ghi nhận nhưng không trừ tồn kho." : "";
      setMessage(`${data.message ?? "Đã ghi nhận điều trị."}${restockText}`);
      setForm(initialForm(warehouseItems, headCount));
      setAttachmentImages([]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể ghi nhận điều trị.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderMetadataField = (field: LivestockTreatmentMetadataField) => {
    const value = form.metadata[field.key] ?? "";
    if (field.inputType === "select") {
      return (
        <label className={styles.treatmentField} key={field.key}>
          <span>{field.label}</span>
          <select value={value} onChange={(event) => setMetadata(field.key, event.target.value)}>
            <option value="">Chưa chọn</option>
            {(field.options ?? []).map((option) => (
              <option value={option} key={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className={styles.treatmentField} key={field.key}>
        <span>{field.label}</span>
        <input
          type={field.inputType ?? "text"}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => setMetadata(field.key, event.target.value)}
        />
      </label>
    );
  };

  return (
    <section id="dieu-tri" className={styles.treatmentPanel}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Điều trị</p>
          <h2>Ghi điều trị cho {groupName}</h2>
        </div>
        <span className={styles.panelBadge}>{warehouseItems.length} vật tư kho khả dụng</span>
      </div>

      <div className={styles.treatmentLayout}>
        <form className={styles.treatmentForm} onSubmit={submitForm}>
          <div className={styles.treatmentTypeGrid} role="group" aria-label="Loại điều trị">
            {LIVESTOCK_TREATMENT_TYPE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={form.type === option.value ? styles.treatmentTypeActive : ""}
                onClick={() => changeType(option.value)}
              >
                <strong>{option.shortLabel}</strong>
                <span>{option.purpose}</span>
              </button>
            ))}
          </div>

          <div className={styles.treatmentFormGrid}>
            <label className={styles.treatmentField}>
              <span>Loại điều trị</span>
              <select value={form.type} onChange={(event) => changeType(event.target.value as LivestockTreatmentType)}>
                {LIVESTOCK_TREATMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.shortLabel}</option>
                ))}
              </select>
            </label>

            <label className={styles.treatmentField}>
              <span>Vật tư từ kho</span>
              <select value={form.warehouseItemId} onChange={(event) => changeWarehouseItem(event.target.value)} required>
                <option value="">Chọn vật tư</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({formatNumber(item.quantity)} {item.unit})
                  </option>
                ))}
              </select>
              {availableItems.length === 0 && (
                <Link className={styles.createInventoryLink} href="/dashboard/quan-ly-kho/tao-moi">
                  Tạo mới vật tư từ kho
                </Link>
              )}
            </label>

            <label className={styles.treatmentField}>
              <span>Tên điều trị</span>
              <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder={`${typeOption.shortLabel} - ${selectedItem?.name ?? "vật tư kho"}`} />
            </label>

            <label className={styles.treatmentField}>
              <span>Ngày điều trị</span>
              <input type="date" value={form.treatmentDate} onChange={(event) => setField("treatmentDate", event.target.value)} required />
            </label>

            <label className={styles.treatmentField}>
              <span>Số vật nuôi đã chọn</span>
              <input
                type="number"
                min="1"
                value={String(form.selectedAnimalIds.length)}
                readOnly
                required
              />
            </label>

            <label className={styles.treatmentField}>
              <span>Liều / con</span>
              <input type="number" min="0" step="0.01" value={form.dosePerAnimal} onChange={(event) => setField("dosePerAnimal", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>Đơn vị liều</span>
              <input value={form.doseUnit} onChange={(event) => setField("doseUnit", event.target.value)} required />
            </label>

            <label className={styles.treatmentField}>
              <span>Tổng lượng dùng</span>
              <input type="number" min="0" step="0.01" value={form.totalQuantity} placeholder={suggestedTotal ? String(suggestedTotal) : ""} onChange={(event) => setField("totalQuantity", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>Lô / batch</span>
              <input value={form.batchLot} onChange={(event) => setField("batchLot", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>Phương pháp</span>
              <input value={form.method} onChange={(event) => setField("method", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>Người thực hiện</span>
              <input value={form.performedBy} onChange={(event) => setField("performedBy", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>WHP (ngày) - thời gian ngưng sử dụng/thu hoạch</span>
              <input type="number" min="0" value={form.withdrawalDays} onChange={(event) => setField("withdrawalDays", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>ESI (ngày) - thời gian cách ly sau điều trị</span>
              <input type="number" min="0" value={form.esiDays} onChange={(event) => setField("esiDays", event.target.value)} />
            </label>

            <label className={styles.treatmentField}>
              <span>Ngày nhắc lại</span>
              <input type="date" value={form.nextDueDate} onChange={(event) => setField("nextDueDate", event.target.value)} />
            </label>

            {typeOption.fields.map(renderMetadataField)}

            <label className={`${styles.treatmentField} ${styles.treatmentFullField}`}>
              <span>Ghi chú</span>
              <textarea rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} />
            </label>

            <div className={`${styles.treatmentField} ${styles.treatmentFullField}`}>
              <span>Ảnh đính kèm (không bắt buộc)</span>
              <label className={styles.attachmentUpload}>
                <input type="file" accept="image/*" multiple onChange={changeAttachmentImages} />
                <strong>Tải ảnh đính kèm</strong>
                <small>Tối đa {MAX_ATTACHMENT_IMAGES} ảnh, 3MB/ảnh.</small>
              </label>
              {attachmentImages.length > 0 && (
                <div className={styles.attachmentPreviewGrid}>
                  {attachmentImages.map((image, index) => (
                    <figure key={`${image.name}-${index}`}>
                      <img src={image.dataUrl} alt={image.name} />
                      <figcaption>
                        <span>{image.name}</span>
                        <button type="button" onClick={() => removeAttachmentImage(index)} aria-label={`Xóa ${image.name}`}>
                          Xóa
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.animalPickerPanel}>
            <div className={styles.animalPickerHead}>
              <div>
                <span>Vật nuôi được điều trị</span>
                <strong>{selectedAnimals.length} / {animals.length} cá thể</strong>
              </div>
              <div className={styles.animalPickerActions}>
                <button type="button" className={styles.secondaryAction} onClick={selectAllAnimals} disabled={animals.length === 0}>
                  Chọn tất cả
                </button>
                <button type="button" className={styles.secondaryAction} onClick={clearSelectedAnimals} disabled={form.selectedAnimalIds.length === 0}>
                  Bỏ chọn
                </button>
                <button type="button" className={styles.secondaryAction} onClick={scannerActive ? stopQrScanner : startQrScanner} disabled={animals.length === 0}>
                  {scannerActive ? "Dừng quét QR" : "Quét QR bằng camera"}
                </button>
              </div>
            </div>

            {scannerOpen && (
              <div className={styles.qrScanner}>
                <span className={styles.qrScanFrame} aria-hidden="true" />
                <video ref={videoRef} muted playsInline />
                <canvas ref={canvasRef} aria-hidden="true" />
              </div>
            )}

            <div className={styles.qrManualRow}>
              <input
                value={qrInput}
                onChange={(event) => setQrInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    scanManualQr();
                  }
                }}
                placeholder="Nhập hoặc dán mã QR vật nuôi"
              />
              <button type="button" className={styles.secondaryAction} onClick={scanManualQr}>
                Chọn theo mã
              </button>
            </div>

            {qrMessage && <p className={styles.qrMessage}>{qrMessage}</p>}

            <div className={styles.animalPicker}>
              {animals.length === 0 ? (
                <div className={styles.emptyState}>Nhóm chưa có hồ sơ cá thể để chọn.</div>
              ) : (
                animals.map((animal) => (
                  <label key={animal.id}>
                    <input type="checkbox" checked={form.selectedAnimalIds.includes(animal.id)} onChange={() => toggleAnimal(animal.id)} />
                    <span>{animal.code || animal.qrCode || "Cá thể chưa có mã"}</span>
                    {animal.qrCode && <small>{animal.qrCode}</small>}
                  </label>
                ))
              )}
            </div>
          </div>

          {selectedItem && (
            <div className={styles.stockPreview}>
              <div>
                <span>Tồn hiện tại</span>
                <strong>{formatNumber(selectedItem.quantity)} {selectedItem.unit}</strong>
              </div>
              <div>
                <span>Sau điều trị</span>
                <strong>{canDeduct ? `${formatNumber(Math.max(remainingAfter, 0))} ${selectedItem.unit}` : "Không trừ công cụ"}</strong>
              </div>
              <div>
                <span>Hạn dùng</span>
                <strong>{formatDate(selectedItem.expiryDate)}</strong>
              </div>
              <div>
                <span>Trạng thái</span>
                <strong>{statusText(selectedItem.status)}</strong>
              </div>
            </div>
          )}

          {availableItems.length === 0 && (
            <div className={styles.emptyState}>
              Chưa có vật tư kho phù hợp với loại điều trị này. Vui lòng tạo mới ở mục vật tư từ trong kho.
              <Link className={styles.createInventoryLink} href="/dashboard/quan-ly-kho/tao-moi">Tạo vật tư mới</Link>
            </div>
          )}

          {message && <p className={styles.treatmentMessage}>{message}</p>}

          <div className={styles.treatmentActions}>
            <button type="submit" disabled={submitting || availableItems.length === 0 || form.selectedAnimalIds.length === 0} className={styles.primaryAction}>
              {submitting ? <CowLoading label="Đang tải..." /> : "Lưu điều trị"}
            </button>
            <button type="button" disabled={submitting} className={styles.secondaryAction} onClick={() => router.push(closeHref)}>
              Đóng
            </button>
          </div>
        </form>

        <aside className={styles.treatmentHistory}>
          <div>
            <p className={styles.eyebrow}>Nhật ký gần đây</p>
            <h3>{recentTreatments.length} bản ghi điều trị</h3>
          </div>
          {recentTreatments.length === 0 ? (
            <div className={styles.emptyState}>Chưa có điều trị nào cho nhóm này.</div>
          ) : (
            recentTreatments.slice(0, 8).map((item) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <span>{formatDate(item.treatmentDate)} · {item.treatedCount} con</span>
                <p>{item.warehouseItemName || item.warehouseItemCode || "Vật tư kho"}: {formatNumber(item.totalQuantity)} {item.inventoryUnit}</p>
                {attachmentCount(item.metadata) > 0 && <small>{attachmentCount(item.metadata)} ảnh đính kèm</small>}
                {item.animalCodes.length > 0 && <small>{item.animalCodes.slice(0, 4).join(", ")}{item.animalCodes.length > 4 ? "..." : ""}</small>}
              </article>
            ))
          )}
        </aside>
      </div>
    </section>
  );
}
