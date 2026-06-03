"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";
import styles from "./public-livestock-qr-scanner.module.css";

type PublicLookupResponse = {
  animal: {
    id: string;
    code: string | null;
    qrCode: string | null;
    identity: string | null;
    species: string | null;
    breed: string | null;
    gender: string | null;
    lifeStage: string | null;
    birthDate: string | null;
    status: string | null;
    description: string | null;
    updatedAt: string | null;
    createdAt: string | null;
  };
  group: {
    id: string;
    code: string;
    name: string;
    species: string;
    breed: string | null;
    healthStatus: string | null;
    purpose: string | null;
  };
  farm: {
    name: string;
    locationName: string | null;
  };
  zone: {
    name: string;
    status: string | null;
  } | null;
  latestEvent: {
    title: string | null;
    type: string | null;
    eventDate: string | null;
    createdAt: string | null;
  } | null;
  latestTreatment: {
    name: string | null;
    type: string | null;
    treatmentDate: string | null;
    createdAt: string | null;
  } | null;
  eventCount: number;
  treatmentCount: number;
  publicPath: string;
};

type CameraConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
  zoom?: number;
};

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ageLabel(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const start = new Date(value).getTime();
  if (Number.isNaN(start)) return "Chưa cập nhật";
  const months = Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 30.4375)));
  if (months < 1) return "Dưới 1 tháng";
  if (months < 24) return `${months} tháng`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} năm ${rest} tháng` : `${years} năm`;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function statusLabel(status: string | null) {
  const raw = String(status ?? "").trim();
  if (!raw) return "Chưa cập nhật";
  const normalized = normalizeText(raw);
  if (normalized.includes("tu vong") || normalized.includes("deceased") || normalized.includes("dead")) return "Đã tử vong";
  if (normalized.includes("dang hoat dong") || normalized.includes("active")) return "Đang theo dõi";
  if (normalized.includes("theo doi") || normalized.includes("canh bao") || normalized.includes("benh")) return "Cần chú ý";
  if (normalized.includes("ngung") || normalized.includes("inactive")) return "Ngừng theo dõi";
  return raw;
}

function shortEventLabel(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";
  return value.replace(/_/g, " ");
}

function readApiMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") return data.message;
  return fallback;
}

function ScannerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M7 7h4v4H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h1.5v1.5H14zM17 14h1v4h-1zM14 17h1.5v1H14z" />
    </svg>
  );
}

export default function PublicLivestockQrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lookupInFlightRef = useRef(false);
  const recentScanRef = useRef<{ value: string; at: number } | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState("Bật camera để quét mã QR trên thẻ vật nuôi.");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicLookupResponse | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (scanLoopRef.current != null) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerActive(false);
    setScannerOpen(false);
  }, []);

  useEffect(() => stopScanner, [stopScanner]);

  const lookupCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || lookupInFlightRef.current) return;

    lookupInFlightRef.current = true;
    setLoading(true);
    setLastScanned(code);
    setMessage(`Đã đọc mã "${code}". Đang tra cứu hồ sơ...`);
    setMessageTone("neutral");

    try {
      const response = await fetch(`/api/public/vat-nuoi/lookup?code=${encodeURIComponent(code)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiMessage(data, "Không tìm thấy hồ sơ vật nuôi từ mã QR này."));

      setResult(data as PublicLookupResponse);
      setMessage("Đã tìm thấy hồ sơ vật nuôi.");
      setMessageTone("success");
      stopScanner();
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "Không thể tra cứu hồ sơ vật nuôi.");
      setMessageTone("error");
    } finally {
      window.setTimeout(() => {
        lookupInFlightRef.current = false;
      }, 900);
      setLoading(false);
    }
  }, [stopScanner]);

  const handleDecodedValue = useCallback((value: string) => {
    const code = value.trim();
    if (!code) return;

    const now = Date.now();
    const recent = recentScanRef.current;
    if (recent && recent.value === code && now - recent.at < 1600) return;
    recentScanRef.current = { value: code, at: now };
    void lookupCode(code);
  }, [lookupCode]);

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

    const baseSide = Math.min(width, height);
    for (const ratio of [0.92, 0.78, 0.64, 0.5]) {
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

  const startScanner = useCallback(() => {
    setResult(null);
    setMessageTone("neutral");
    setMessage("Đang chuẩn bị camera...");
    setScannerOpen(true);
  }, []);

  useEffect(() => {
    if (!scannerOpen || scannerActive || zxingControlsRef.current) return;

    let cancelled = false;

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Trình duyệt không hỗ trợ mở camera. Bạn có thể nhập mã QR thủ công.");
        setMessageTone("error");
        setScannerOpen(false);
        return;
      }

      try {
        if (!videoRef.current) {
          setMessage("Không tìm thấy khung camera. Vui lòng thử lại.");
          setMessageTone("error");
          return;
        }

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 70,
          delayBetweenScanSuccess: 260,
          tryPlayVideoTimeout: 5000,
        });

        setMessage("Camera đang quét mã QR...");
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
          (scanResult) => {
            const rawValue = scanResult?.getText()?.trim();
            if (rawValue) handleDecodedValue(rawValue);
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
          // Camera vẫn quét được nếu trình duyệt không hỗ trợ các constraint nâng cao.
        }

        const scanFrame = () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !lookupInFlightRef.current) {
            const fallbackResult = decodeFromVideo(video);
            if (fallbackResult) handleDecodedValue(fallbackResult);
          }
          scanLoopRef.current = window.requestAnimationFrame(scanFrame);
        };

        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      } catch (error) {
        setScannerOpen(false);
        setScannerActive(false);
        setMessage(error instanceof Error ? error.message : "Không thể mở camera. Bạn có thể nhập mã QR thủ công.");
        setMessageTone("error");
      }
    };

    void openCamera();

    return () => {
      cancelled = true;
    };
  }, [decodeFromVideo, handleDecodedValue, scannerActive, scannerOpen]);

  const submitManualCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      setMessage("Vui lòng nhập mã QR, mã vật nuôi hoặc đường dẫn public.");
      setMessageTone("error");
      return;
    }
    void lookupCode(code);
    setManualCode("");
  };

  const currentAnimal = result?.animal;
  const latestUpdate = currentAnimal?.updatedAt || currentAnimal?.createdAt;

  return (
    <div className={styles.shell}>
      <section className={styles.scannerPanel}>
        <div className={styles.scannerHeader}>
          <div>
            <p>Truy xuất vật nuôi</p>
            <h1>Quét QR để xem hồ sơ cá thể</h1>
          </div>
          <span className={styles.statusBadge}>{scannerActive ? "Đang quét" : "Sẵn sàng"}</span>
        </div>

        <div className={styles.scanSurface} data-active={scannerOpen}>
          {scannerOpen ? (
            <>
              <span className={styles.scanFrame} aria-hidden="true" />
              <video ref={videoRef} muted playsInline />
              <canvas ref={canvasRef} aria-hidden="true" />
            </>
          ) : (
            <div className={styles.scanPlaceholder}>
              <ScannerIcon />
              <strong>{result ? "Đã có kết quả quét" : "Camera chưa bật"}</strong>
              <span>Đưa mã QR vào giữa khung sau khi bật camera.</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={scannerOpen ? stopScanner : startScanner} disabled={loading}>
            <ScannerIcon />
            {scannerOpen ? "Dừng quét" : "Bật camera quét"}
          </button>
          {result && (
            <button type="button" className={styles.secondaryButton} onClick={startScanner} disabled={loading}>
              Quét mã khác
            </button>
          )}
        </div>

        <form className={styles.manualForm} onSubmit={submitManualCode}>
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Nhập/dán mã QR hoặc mã vật nuôi"
            disabled={loading}
          />
          <button type="submit" className={styles.secondaryButton} disabled={loading}>
            Tra cứu
          </button>
        </form>

        <p className={styles.message} data-tone={messageTone}>
          {loading ? "Đang tra cứu..." : message}
        </p>
        {lastScanned && <p className={styles.lastScan}>Mã vừa đọc: {lastScanned}</p>}
      </section>

      {result && currentAnimal && (
        <section className={styles.resultPanel}>
          <div className={styles.resultHeader}>
            <div>
              <p>{result.farm.name}</p>
              <h2>{currentAnimal.code || currentAnimal.qrCode || "Cá thể chưa có mã"}</h2>
              <span>{currentAnimal.species || result.group.species} · {currentAnimal.breed || result.group.breed || "Chưa cập nhật giống"}</span>
            </div>
            <span className={styles.statusPill}>{statusLabel(currentAnimal.status)}</span>
          </div>

          <p className={styles.description}>
            {currentAnimal.description || `Cá thể thuộc nhóm ${result.group.name}.`}
          </p>

          <dl className={styles.factGrid}>
            <div><dt>Mã QR</dt><dd>{currentAnimal.qrCode || "Chưa cập nhật"}</dd></div>
            <div><dt>Nhận diện</dt><dd>{currentAnimal.identity || "Chưa cập nhật"}</dd></div>
            <div><dt>Giới tính</dt><dd>{currentAnimal.gender || "Chưa cập nhật"}</dd></div>
            <div><dt>Giai đoạn</dt><dd>{currentAnimal.lifeStage || "Chưa cập nhật"}</dd></div>
            <div><dt>Tuổi</dt><dd>{ageLabel(currentAnimal.birthDate)}</dd></div>
            <div><dt>Khu vực</dt><dd>{result.zone?.name || "Chưa cập nhật"}</dd></div>
            <div><dt>Nhóm</dt><dd>{result.group.name}</dd></div>
            <div><dt>Cập nhật</dt><dd>{formatDate(latestUpdate)}</dd></div>
          </dl>

          <div className={styles.recentGrid}>
            <article>
              <span>Sự kiện gần nhất</span>
              <strong>{result.latestEvent?.title || shortEventLabel(result.latestEvent?.type)}</strong>
              <small>{formatDate(result.latestEvent?.eventDate || result.latestEvent?.createdAt)}</small>
            </article>
            <article>
              <span>Điều trị gần nhất</span>
              <strong>{result.latestTreatment?.name || shortEventLabel(result.latestTreatment?.type)}</strong>
              <small>{formatDate(result.latestTreatment?.treatmentDate || result.latestTreatment?.createdAt)}</small>
            </article>
          </div>

          <a className={styles.detailLink} href={result.publicPath}>
            <ScannerIcon />
            Xem hồ sơ chi tiết
          </a>
        </section>
      )}
    </div>
  );
}
