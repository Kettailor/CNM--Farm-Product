"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import CowLoading from "@/components/cow-loading";
import styles from "./new-group-wizard.module.css";

export type LivestockZoneOption = {
  id: string;
  name: string;
};

type FormState = {
  species: string;
  groupName: string;
  description: string;
  createFrom: string;
  breed: string;
  headCount: string;
  gender: string;
  lifeStage: string;
  healthStatus: string;
  purpose: string;
  locationId: string;
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
  primaryIdentification: string;
  reproductiveState: string;
  reproductiveAvailability: string;
  lifetimeAdg: string;
  lifetimeMjDay: string;
  targetLiveWeight: string;
  targetWeightDate: string;
};

type SpeciesProfile = {
  label: string;
  groupPrefix: string;
  breeds: string[];
  genders: string[];
  lifeStages: string[];
  purposes: string[];
  origins: string[];
  conceptionTypes: string[];
  eyeColors: string[];
  earTypes: string[];
  hornTypes: string[];
  mouths: string[];
  defaults: Pick<
    FormState,
    | "breed"
    | "headCount"
    | "gender"
    | "lifeStage"
    | "healthStatus"
    | "purpose"
    | "origin"
    | "price"
    | "expenseAccount"
    | "conceptionType"
    | "averageBirthWeight"
    | "colouring"
    | "eyeColor"
    | "earType"
    | "hornType"
    | "mouth"
    | "bodyConditionScore"
    | "primaryIdentification"
    | "reproductiveState"
    | "reproductiveAvailability"
    | "lifetimeAdg"
    | "lifetimeMjDay"
    | "targetLiveWeight"
  >;
};

const speciesProfiles: SpeciesProfile[] = [
  {
    label: "Bò",
    groupPrefix: "Đàn bò",
    breeds: ["Bò lai Sind", "Angus", "Brahman", "Hereford", "Holstein Friesian", "Droughtmaster"],
    genders: ["Cái", "Đực", "Thiến", "Hỗn hợp"],
    lifeStages: ["Bê", "Tơ", "Trưởng thành", "Vỗ béo", "Sinh sản"],
    purposes: ["Bò thịt", "Bò sữa", "Sinh sản", "Nuôi hậu bị", "Khai thác giống"],
    origins: ["Sinh tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Phối giống tự nhiên", "Thụ tinh nhân tạo", "Không áp dụng"],
    eyeColors: ["Nâu", "Đen", "Hổ phách"],
    earTypes: ["Bình thường", "Tai cụp", "Cần theo dõi"],
    hornTypes: ["Không sừng", "Có sừng", "Cắt sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng", "Tổn thương nhẹ"],
    defaults: {
      breed: "Bò lai Sind",
      headCount: "10",
      gender: "Cái",
      lifeStage: "Bê",
      healthStatus: "Đang hoạt động",
      purpose: "Bò thịt",
      origin: "Sinh tại trang trại",
      price: "1500000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Phối giống tự nhiên",
      averageBirthWeight: "28",
      colouring: "Nâu",
      eyeColor: "Nâu",
      earType: "Bình thường",
      hornType: "Không sừng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,75",
      lifetimeMjDay: "82",
      targetLiveWeight: "550",
    },
  },
  {
    label: "Trâu",
    groupPrefix: "Đàn trâu",
    breeds: ["Trâu nội", "Murrah", "Nili-Ravi", "Trâu lai"],
    genders: ["Cái", "Đực", "Thiến", "Hỗn hợp"],
    lifeStages: ["Nghé", "Tơ", "Trưởng thành", "Sinh sản"],
    purposes: ["Trâu thịt", "Sinh sản", "Kéo cày", "Nuôi hậu bị"],
    origins: ["Sinh tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Phối giống tự nhiên", "Thụ tinh nhân tạo", "Không áp dụng"],
    eyeColors: ["Đen", "Nâu"],
    earTypes: ["Bình thường", "Tai cụp", "Cần theo dõi"],
    hornTypes: ["Có sừng", "Cắt sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng"],
    defaults: {
      breed: "Trâu nội",
      headCount: "8",
      gender: "Cái",
      lifeStage: "Nghé",
      healthStatus: "Đang hoạt động",
      purpose: "Trâu thịt",
      origin: "Sinh tại trang trại",
      price: "1800000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Phối giống tự nhiên",
      averageBirthWeight: "32",
      colouring: "Đen xám",
      eyeColor: "Đen",
      earType: "Bình thường",
      hornType: "Có sừng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,65",
      lifetimeMjDay: "86",
      targetLiveWeight: "600",
    },
  },
  {
    label: "Dê",
    groupPrefix: "Đàn dê",
    breeds: ["Bách Thảo", "Boer", "Alpine", "Saanen", "Dê cỏ"],
    genders: ["Cái", "Đực", "Thiến", "Hỗn hợp"],
    lifeStages: ["Dê con", "Tơ", "Trưởng thành", "Sinh sản"],
    purposes: ["Dê thịt", "Dê sữa", "Sinh sản", "Nuôi hậu bị"],
    origins: ["Sinh tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Phối giống tự nhiên", "Thụ tinh nhân tạo", "Không áp dụng"],
    eyeColors: ["Nâu", "Vàng", "Đen"],
    earTypes: ["Bình thường", "Tai dài", "Tai cụp"],
    hornTypes: ["Có sừng", "Không sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng"],
    defaults: {
      breed: "Bách Thảo",
      headCount: "15",
      gender: "Cái",
      lifeStage: "Dê con",
      healthStatus: "Đang hoạt động",
      purpose: "Dê thịt",
      origin: "Sinh tại trang trại",
      price: "650000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Phối giống tự nhiên",
      averageBirthWeight: "3",
      colouring: "Nâu trắng",
      eyeColor: "Nâu",
      earType: "Bình thường",
      hornType: "Có sừng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,16",
      lifetimeMjDay: "12",
      targetLiveWeight: "45",
    },
  },
  {
    label: "Cừu",
    groupPrefix: "Đàn cừu",
    breeds: ["Dorper", "Suffolk", "Merino", "Cừu Phan Rang"],
    genders: ["Cái", "Đực", "Thiến", "Hỗn hợp"],
    lifeStages: ["Cừu con", "Tơ", "Trưởng thành", "Sinh sản"],
    purposes: ["Cừu thịt", "Lông cừu", "Sinh sản", "Nuôi hậu bị"],
    origins: ["Sinh tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Phối giống tự nhiên", "Thụ tinh nhân tạo", "Không áp dụng"],
    eyeColors: ["Nâu", "Đen"],
    earTypes: ["Bình thường", "Tai cụp", "Cần theo dõi"],
    hornTypes: ["Không sừng", "Có sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng"],
    defaults: {
      breed: "Dorper",
      headCount: "12",
      gender: "Cái",
      lifeStage: "Cừu con",
      healthStatus: "Đang hoạt động",
      purpose: "Cừu thịt",
      origin: "Sinh tại trang trại",
      price: "700000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Phối giống tự nhiên",
      averageBirthWeight: "4",
      colouring: "Trắng nâu",
      eyeColor: "Nâu",
      earType: "Bình thường",
      hornType: "Không sừng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,22",
      lifetimeMjDay: "14",
      targetLiveWeight: "55",
    },
  },
  {
    label: "Heo",
    groupPrefix: "Đàn heo",
    breeds: ["Landrace", "Yorkshire", "Duroc", "Pietrain", "Heo lai"],
    genders: ["Cái", "Đực", "Thiến", "Hỗn hợp"],
    lifeStages: ["Heo con", "Cai sữa", "Hậu bị", "Vỗ béo", "Nái sinh sản"],
    purposes: ["Heo thịt", "Sinh sản", "Nuôi hậu bị"],
    origins: ["Sinh tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Thụ tinh nhân tạo", "Phối giống tự nhiên", "Không áp dụng"],
    eyeColors: ["Đen", "Nâu"],
    earTypes: ["Tai đứng", "Tai cụp", "Bình thường"],
    hornTypes: ["Không áp dụng"],
    mouths: ["Bình thường", "Cần kiểm tra răng"],
    defaults: {
      breed: "Landrace",
      headCount: "20",
      gender: "Hỗn hợp",
      lifeStage: "Cai sữa",
      healthStatus: "Đang hoạt động",
      purpose: "Heo thịt",
      origin: "Sinh tại trang trại",
      price: "350000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Thụ tinh nhân tạo",
      averageBirthWeight: "1,4",
      colouring: "Trắng",
      eyeColor: "Đen",
      earType: "Tai cụp",
      hornType: "Không áp dụng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,70",
      lifetimeMjDay: "25",
      targetLiveWeight: "110",
    },
  },
  {
    label: "Gà",
    groupPrefix: "Đàn gà",
    breeds: ["Gà ta", "Gà ri", "Lương Phượng", "ISA Brown", "Ross 308"],
    genders: ["Mái", "Trống", "Hỗn hợp"],
    lifeStages: ["Gà con", "Hậu bị", "Đẻ trứng", "Thịt"],
    purposes: ["Gà thịt", "Gà đẻ trứng", "Sinh sản"],
    origins: ["Ấp tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Không áp dụng"],
    eyeColors: ["Nâu", "Đen", "Vàng"],
    earTypes: ["Không áp dụng"],
    hornTypes: ["Không áp dụng"],
    mouths: ["Bình thường", "Cần kiểm tra mỏ"],
    defaults: {
      breed: "Gà ta",
      headCount: "50",
      gender: "Hỗn hợp",
      lifeStage: "Gà con",
      healthStatus: "Đang hoạt động",
      purpose: "Gà thịt",
      origin: "Ấp tại trang trại",
      price: "45000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Không áp dụng",
      averageBirthWeight: "0,04",
      colouring: "Nâu vàng",
      eyeColor: "Nâu",
      earType: "Không áp dụng",
      hornType: "Không áp dụng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,045",
      lifetimeMjDay: "1,2",
      targetLiveWeight: "2,2",
    },
  },
  {
    label: "Vịt",
    groupPrefix: "Đàn vịt",
    breeds: ["Vịt cỏ", "Vịt bầu", "Vịt siêu thịt", "Vịt Khaki Campbell"],
    genders: ["Mái", "Trống", "Hỗn hợp"],
    lifeStages: ["Vịt con", "Hậu bị", "Đẻ trứng", "Thịt"],
    purposes: ["Vịt thịt", "Vịt đẻ trứng", "Sinh sản"],
    origins: ["Ấp tại trang trại", "Mua nhập đàn", "Chuyển từ nhóm khác"],
    conceptionTypes: ["Không áp dụng"],
    eyeColors: ["Nâu", "Đen"],
    earTypes: ["Không áp dụng"],
    hornTypes: ["Không áp dụng"],
    mouths: ["Bình thường", "Cần kiểm tra mỏ"],
    defaults: {
      breed: "Vịt cỏ",
      headCount: "40",
      gender: "Hỗn hợp",
      lifeStage: "Vịt con",
      healthStatus: "Đang hoạt động",
      purpose: "Vịt thịt",
      origin: "Ấp tại trang trại",
      price: "50000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Không áp dụng",
      averageBirthWeight: "0,055",
      colouring: "Nâu xám",
      eyeColor: "Nâu",
      earType: "Không áp dụng",
      hornType: "Không áp dụng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,055",
      lifetimeMjDay: "1,4",
      targetLiveWeight: "2,8",
    },
  },
  {
    label: "Cá",
    groupPrefix: "Đàn cá",
    breeds: ["Cá rô phi", "Cá trắm", "Cá chép", "Cá lóc", "Cá tra"],
    genders: ["Hỗn hợp", "Cái", "Đực"],
    lifeStages: ["Cá giống", "Cá hương", "Cá thương phẩm", "Bố mẹ"],
    purposes: ["Cá thương phẩm", "Sinh sản", "Nuôi giống"],
    origins: ["Ươm tại trang trại", "Mua nhập đàn", "Chuyển từ ao khác"],
    conceptionTypes: ["Không áp dụng", "Sinh sản nhân tạo"],
    eyeColors: ["Đen", "Vàng"],
    earTypes: ["Không áp dụng"],
    hornTypes: ["Không áp dụng"],
    mouths: ["Bình thường", "Cần kiểm tra"],
    defaults: {
      breed: "Cá rô phi",
      headCount: "200",
      gender: "Hỗn hợp",
      lifeStage: "Cá giống",
      healthStatus: "Đang hoạt động",
      purpose: "Cá thương phẩm",
      origin: "Ươm tại trang trại",
      price: "3000",
      expenseAccount: "Vật nuôi",
      conceptionType: "Không áp dụng",
      averageBirthWeight: "0,02",
      colouring: "Xám bạc",
      eyeColor: "Đen",
      earType: "Không áp dụng",
      hornType: "Không áp dụng",
      mouth: "Bình thường",
      bodyConditionScore: "3",
      primaryIdentification: "Mã QR cá thể",
      reproductiveState: "Chưa xác định",
      reproductiveAvailability: "Chưa xác định",
      lifetimeAdg: "0,018",
      lifetimeMjDay: "0,2",
      targetLiveWeight: "0,8",
    },
  },
];

const createFromOptions = ["Tạo nhóm mới", "Thêm vật nuôi đã ghi nhận", "Sao chép nhóm hiện có"];
const healthOptions = ["Đang hoạt động", "Cần theo dõi", "Cách ly", "Ngừng theo dõi"];
const expenseOptions = ["Vật nuôi", "Con giống", "Thức ăn", "Thú y", "Vận chuyển"];
const reproductionOptions = ["Chưa xác định", "Không mang thai", "Đang mang thai", "Đang nuôi con", "Không áp dụng"];

const steps = [
  {
    key: "setup",
    title: "Thiết lập nhóm",
    icon: "list",
    desc: "Chọn loài, thông tin nhóm và cách tạo nhóm.",
    items: ["Loài vật nuôi", "Tên nhóm", "Mô tả"],
  },
  {
    key: "herd",
    title: "Đàn & phân loại",
    icon: "info",
    desc: "Giống, số lượng, giới tính, giai đoạn, mục đích và khu vực.",
    items: ["Loài", "Giống", "Số lượng", "Giới tính", "Giai đoạn", "Sức khỏe", "Mục đích", "Khu vực", "Ghi chú"],
  },
  {
    key: "origin",
    title: "Nguồn gốc & sinh/nhập đàn",
    icon: "origin",
    desc: "Ngày sinh hoặc nhập đàn, nguồn gốc, giá trị, bố mẹ và ghi chú sức khỏe.",
    items: ["Nguồn gốc", "Giá trị", "Tài khoản chi phí", "Ngày sinh", "Kiểu phối giống", "Khối lượng sơ sinh", "Ghi chú sinh", "Vấn đề sức khỏe", "Mã mẹ", "Mã bố"],
  },
  {
    key: "traits",
    title: "Đặc điểm & thể trạng",
    icon: "traits",
    desc: "Màu sắc, tai, sừng, miệng, điểm thể trạng và ghi chú đặc điểm.",
    items: ["Màu sắc", "Màu mắt", "Kiểu tai", "Kiểu sừng", "Miệng", "Điểm thể trạng", "Ghi chú"],
  },
  {
    key: "identification",
    title: "Mã QR",
    icon: "id",
    desc: "Hệ thống tự cấp mã QR riêng cho từng cá thể trong nhóm.",
    items: ["Mã QR cá thể", "Quản lý QR-only", "Xuất PDF để in"],
  },
  {
    key: "production",
    title: "Sản xuất",
    icon: "production",
    desc: "Tình trạng sinh sản và mục tiêu tăng trọng.",
    items: ["Sinh sản", "Khả dụng", "Tăng trọng", "Năng lượng", "Khối lượng mục tiêu", "Ngày mục tiêu"],
  },
] as const;

const stepKeys = steps.map((step) => step.key);

type SpeciesVisualKey = "cow" | "buffalo" | "goat" | "sheep" | "pig" | "chicken" | "duck" | "fish" | "other";
type SpeciesVisual = { icon: SpeciesVisualKey; color: string; background: string };

const speciesVisuals: Record<string, SpeciesVisual> = {
  Bò: { icon: "cow", color: "#8a5a34", background: "linear-gradient(135deg, #fff7ed, #fed7aa)" },
  Trâu: { icon: "buffalo", color: "#475569", background: "linear-gradient(135deg, #f8fafc, #cbd5e1)" },
  Dê: { icon: "goat", color: "#0f766e", background: "linear-gradient(135deg, #ecfdf5, #99f6e4)" },
  Cừu: { icon: "sheep", color: "#64748b", background: "linear-gradient(135deg, #f8fafc, #e2e8f0)" },
  Heo: { icon: "pig", color: "#db2777", background: "linear-gradient(135deg, #fdf2f8, #fbcfe8)" },
  Gà: { icon: "chicken", color: "#d97706", background: "linear-gradient(135deg, #fffbeb, #fde68a)" },
  Vịt: { icon: "duck", color: "#0284c7", background: "linear-gradient(135deg, #ecfeff, #bae6fd)" },
  Cá: { icon: "fish", color: "#2563eb", background: "linear-gradient(135deg, #eff6ff, #bfdbfe)" },
};

function getSpeciesVisual(species: string): SpeciesVisual {
  return speciesVisuals[species] ?? { icon: "other", color: "#64748b", background: "linear-gradient(135deg, #f8fafc, #e5e7eb)" };
}

function speciesVisualStyle(visual: SpeciesVisual): CSSProperties {
  return {
    "--species-color": visual.color,
    "--species-bg": visual.background,
  } as CSSProperties;
}

function SpeciesGlyph({ type }: { type: SpeciesVisualKey }) {
  switch (type) {
    case "cow":
    case "buffalo":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M11 28c0-6 5-10 11-10h20c6 0 11 4 11 10v8c0 7-6 12-13 12H24c-7 0-13-5-13-12v-8Z" />
          <path d="M17 23 9 17m38 6 8-6M24 18l-3-7m19 7 3-7M27 39c3 2 7 2 10 0M21 47v7m22-7v7" />
          <circle cx="25" cy="32" r="2.4" />
          <circle cx="39" cy="32" r="2.4" />
        </svg>
      );
    case "goat":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 29c3-8 9-12 17-12s13 4 16 12l-3 6c-2 4-6 7-11 7h-5c-5 0-9-3-11-7l-3-6Z" />
          <path d="m22 22-6-8m31 8 6-8M28 39c3 2 9 2 12 0M22 45v8m22-8v8" />
          <circle cx="28" cy="31" r="2.2" />
          <circle cx="40" cy="31" r="2.2" />
        </svg>
      );
    case "sheep":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 29a9 9 0 0 1 9-9h10a9 9 0 0 1 9 9v7a9 9 0 0 1-9 9H27a9 9 0 0 1-9-9v-7Z" />
          <path d="M20 25c-3-4-3-8 1-11m23 11c3-4 3-8-1-11M27 38c3 2 7 2 10 0M24 46v8m16-8v8" />
          <circle cx="26" cy="31" r="2.3" />
          <circle cx="38" cy="31" r="2.3" />
        </svg>
      );
    case "pig":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 31c0-7 6-13 13-13h10c7 0 13 6 13 13v4c0 7-6 13-13 13H27c-7 0-13-6-13-13v-4Z" />
          <path d="m22 22-5-7m25 7 5-7M23 47v7m18-7v7" />
          <ellipse cx="32" cy="38" rx="6" ry="4" />
          <circle cx="27" cy="32" r="2.2" />
          <circle cx="37" cy="32" r="2.2" />
        </svg>
      );
    case "chicken":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M22 30c0-8 6-14 14-14 7 0 13 5 13 12 0 4-2 8-5 10l-4 3H29c-4 0-7-3-7-7v-4Z" />
          <path d="m30 16 3-6 3 6m4 1 5-4m-19 4-5-4M28 45v8m10-8v8" />
          <path d="m42 30 8 3-8 4Z" />
          <circle cx="35" cy="29" r="2.1" />
        </svg>
      );
    case "duck":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 35c0-6 5-11 11-11h7c7 0 13 6 13 13v2c0 7-6 13-13 13h-7c-6 0-11-5-11-11v-6Z" />
          <path d="M36 25c3-4 7-6 11-6M24 47v7m12-7v7" />
          <path d="M44 34h9l-4 5h-7Z" />
          <circle cx="31" cy="31" r="2.2" />
        </svg>
      );
    case "fish":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M12 33c8-10 22-14 36-4l6-6v20l-6-6c-14 10-28 6-36-4Z" />
          <path d="M37 27c-3 4-3 8 0 12" />
          <circle cx="24" cy="31" r="2.3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 34c0-8 6-14 14-14h8c8 0 14 6 14 14s-6 14-14 14h-8c-8 0-14-6-14-14Z" />
          <path d="M28 39c2 1 6 1 8 0M23 48v6m18-6v6" />
          <circle cx="26" cy="32" r="2.3" />
          <circle cx="38" cy="32" r="2.3" />
        </svg>
      );
  }
}

function addMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function defaultGroupName(profile: SpeciesProfile) {
  return `${profile.groupPrefix} ${new Date().getFullYear()}`;
}

function makeInitialForm(defaultLocationId = ""): FormState {
  const profile = speciesProfiles[0];
  return {
    species: profile.label,
    groupName: defaultGroupName(profile),
    description: "",
    createFrom: createFromOptions[0],
    locationId: defaultLocationId,
    herdNotes: "",
    birthDate: addMonths(-2),
    birthNotes: "",
    healthIssues: "",
    maternityId: "",
    paternityId: "",
    traitNotes: "",
    targetWeightDate: addMonths(18),
    ...profile.defaults,
  };
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case "list":
      return <svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>;
    case "info":
      return <svg viewBox="0 0 24 24"><path d="M12 17v-6" /><path d="M12 7h.01" /><path d="M5 4h14v16H5z" /></svg>;
    case "origin":
      return <svg viewBox="0 0 24 24"><path d="M4 19h16" /><path d="M7 19V9l5-4 5 4v10" /><path d="M9 13h6" /></svg>;
    case "traits":
      return <svg viewBox="0 0 24 24"><path d="M5 19c6-1 9-5 9-12" /><path d="M9 12c4 0 7-2 9-6" /><path d="M14 7h5v5" /></svg>;
    case "id":
      return <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z" /><path d="M8 10h4M8 14h8" /></svg>;
    case "production":
      return <svg viewBox="0 0 24 24"><path d="M12 21a8 8 0 0 0 8-8c0-5-8-10-8-10S4 8 4 13a8 8 0 0 0 8 8Z" /><path d="M9 13a3 3 0 0 0 6 0" /></svg>;
    case "save":
      return <svg viewBox="0 0 24 24"><path d="M5 5h12l2 2v12H5z" /><path d="M8 5v6h8V5M8 19v-5h8v5" /></svg>;
    case "close":
      return <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>;
    default:
      return <svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>;
  }
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
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
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function NewGroupWizard({
  open,
  zones = [],
  onClose,
}: {
  open: boolean;
  zones?: LivestockZoneOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [nameTouched, setNameTouched] = useState(false);
  const [form, setForm] = useState<FormState>(() => makeInitialForm(zones[0]?.id ?? ""));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const profile = useMemo(
    () => speciesProfiles.find((item) => item.label === form.species) ?? speciesProfiles[0],
    [form.species]
  );
  const speciesVisual = useMemo(() => getSpeciesVisual(form.species), [form.species]);
  const step = steps[stepIndex];
  const canSave = form.groupName.trim().length > 0 && form.breed.trim().length > 0 && Number(form.headCount) > 0;

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeSpecies = (species: string) => {
    const nextProfile = speciesProfiles.find((item) => item.label === species) ?? speciesProfiles[0];
    setError("");
    setForm((current) => ({
      ...current,
      species: nextProfile.label,
      groupName: nameTouched ? current.groupName : defaultGroupName(nextProfile),
      ...nextProfile.defaults,
    }));
  };

  const resetAndClose = () => {
    setStepIndex(0);
    setNameTouched(false);
    setError("");
    setForm(makeInitialForm(zones[0]?.id ?? ""));
    onClose();
  };

  const save = () => {
    if (!canSave) {
      setError("Vui lòng nhập tên nhóm, giống và số lượng đầu con trước khi lưu.");
      return;
    }

    setSaving(true);
    void (async () => {
      setError("");
      try {
        const response = await fetch("/api/du-lieu/vat-nuoi/nhom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
        if (!response.ok) {
          setError(result.message ?? "Không thể lưu nhóm vật nuôi.");
          return;
        }
        router.refresh();
        resetAndClose();
      } catch {
        setError("Không thể kết nối tới máy chủ để lưu nhóm vật nuôi.");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="new-group-title">
      <section className={styles.modal}>
        <aside className={styles.sidebar}>
          <div className={styles.photo}>
            <div className={styles.photoArt} style={speciesVisualStyle(speciesVisual)} aria-hidden="true">
              <span className={styles.photoHalo} />
              <span className={styles.photoIcon}><SpeciesGlyph type={speciesVisual.icon} /></span>
              <strong>{form.species}</strong>
              <small>{form.breed}</small>
            </div>
          </div>
          <nav className={styles.stepNav} aria-label="Các bước thêm nhóm vật nuôi">
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
            {step.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>

        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              <span><Icon name={step.icon} /></span>
              <div>
                <h2 id="new-group-title">{step.title}</h2>
                <p>{step.desc}</p>
              </div>
            </div>
            <button type="button" className={styles.closeButton} onClick={resetAndClose} aria-label="Đóng">
              <Icon name="close" />
            </button>
          </header>

          <div className={styles.body}>
            {step.key === "setup" && (
              <>
                <p className={styles.helperText}>
                  Chọn loài vật nuôi trước, hệ thống sẽ tự điền giống, thông số sinh trưởng và chuẩn bị mã QR riêng cho từng cá thể trong nhóm mới.
                </p>
                <Field label="Loài vật nuôi">
                  <Select value={form.species} options={speciesProfiles.map((item) => item.label)} onChange={changeSpecies} />
                </Field>
                <Field label="Tên nhóm" required>
                  <input
                    value={form.groupName}
                    placeholder={`Ví dụ: ${defaultGroupName(profile)}`}
                    onChange={(event) => {
                      setNameTouched(true);
                      update("groupName", event.target.value);
                    }}
                  />
                </Field>
                <Field label="Mô tả">
                  <textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
                </Field>
                <Field label="Tạo từ">
                  <Select value={form.createFrom} options={createFromOptions} onChange={(value) => update("createFrom", value)} />
                </Field>
              </>
            )}

            {step.key === "herd" && (
              <>
                <Field label="Loài vật nuôi">
                  <input value={form.species} readOnly />
                </Field>
                <Field label="Giống" required>
                  <Select value={form.breed} options={profile.breeds} onChange={(value) => update("breed", value)} />
                </Field>
                <Field label="Số lượng đầu con" required>
                  <input type="number" min="1" value={form.headCount} onChange={(event) => update("headCount", event.target.value)} />
                </Field>
                <Field label="Giới tính">
                  <Select value={form.gender} options={profile.genders} onChange={(value) => update("gender", value)} />
                </Field>
                <Field label="Giai đoạn sinh trưởng">
                  <Select value={form.lifeStage} options={profile.lifeStages} onChange={(value) => update("lifeStage", value)} />
                </Field>
                <Field label="Sức khỏe/trạng thái">
                  <Select value={form.healthStatus} options={healthOptions} onChange={(value) => update("healthStatus", value)} />
                </Field>
                <Field label="Mục đích/kiểu sản xuất">
                  <Select value={form.purpose} options={profile.purposes} onChange={(value) => update("purpose", value)} />
                </Field>
                <Field label="Khu vực/chuồng nuôi">
                  <select value={form.locationId} onChange={(event) => update("locationId", event.target.value)}>
                    <option value="">Chưa chọn khu vực</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ghi chú">
                  <textarea value={form.herdNotes} onChange={(event) => update("herdNotes", event.target.value)} />
                </Field>
              </>
            )}

            {step.key === "origin" && (
              <>
                <Field label="Nguồn gốc">
                  <Select value={form.origin} options={profile.origins} onChange={(value) => update("origin", value)} />
                </Field>
                <Field label="Giá trị" required>
                  <div className={styles.inputGroup}>
                    <span>VNĐ</span>
                    <input value={form.price} onChange={(event) => update("price", event.target.value)} />
                  </div>
                </Field>
                <Field label="Tài khoản chi phí">
                  <Select value={form.expenseAccount} options={expenseOptions} onChange={(value) => update("expenseAccount", value)} />
                </Field>
                <Field label="Ngày sinh/ngày nhập" required>
                  <input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} />
                </Field>
                <Field label="Kiểu phối giống">
                  <Select value={form.conceptionType} options={profile.conceptionTypes} onChange={(value) => update("conceptionType", value)} />
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
                  <textarea value={form.healthIssues} placeholder="Nhập vấn đề sức khỏe nếu có" onChange={(event) => update("healthIssues", event.target.value)} />
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
                  <Select value={form.eyeColor} options={profile.eyeColors} onChange={(value) => update("eyeColor", value)} />
                </Field>
                <Field label="Kiểu tai">
                  <Select value={form.earType} options={profile.earTypes} onChange={(value) => update("earType", value)} />
                </Field>
                <Field label="Kiểu sừng">
                  <Select value={form.hornType} options={profile.hornTypes} onChange={(value) => update("hornType", value)} />
                </Field>
                <Field label="Miệng">
                  <Select value={form.mouth} options={profile.mouths} onChange={(value) => update("mouth", value)} />
                </Field>
                <Field label="Điểm thể trạng">
                  <input value={form.bodyConditionScore} onChange={(event) => update("bodyConditionScore", event.target.value)} />
                </Field>
                <Field label="Ghi chú đặc điểm">
                  <textarea value={form.traitNotes} onChange={(event) => update("traitNotes", event.target.value)} />
                </Field>
              </>
            )}

            {step.key === "identification" && (
              <div className={styles.qrPlan}>
                <div className={styles.qrPlanIcon}>
                  <Icon name="id" />
                </div>
                <div>
                  <span>Phương thức quản lý</span>
                  <strong>{form.primaryIdentification}</strong>
                  <p>
                    Khi lưu nhóm, hệ thống sẽ tự tạo {Number(form.headCount) > 0 ? form.headCount : "mỗi"} mã QR không trùng trong database,
                    mỗi cá thể một mã riêng để in và dùng cho các chức năng truy xuất sau này.
                  </p>
                </div>
                <div className={styles.qrStats}>
                  <span>Số QR sẽ cấp</span>
                  <strong>{Number(form.headCount) > 0 ? Number(form.headCount).toLocaleString("vi-VN") : 0}</strong>
                </div>
              </div>
            )}

            {step.key === "production" && (
              <>
                <Field label="Tình trạng sinh sản">
                  <Select value={form.reproductiveState} options={reproductionOptions} onChange={(value) => update("reproductiveState", value)} />
                </Field>
                <Field label="Khả dụng sinh sản">
                  <Select value={form.reproductiveAvailability} options={["Chưa xác định", "Có thể phối giống", "Tạm ngưng", "Không áp dụng"]} onChange={(value) => update("reproductiveAvailability", value)} />
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
              <button type="button" onClick={() => setStepIndex((value) => Math.min(stepKeys.length - 1, value + 1))} disabled={stepIndex === stepKeys.length - 1 || saving}>
                Tiếp tục <span>›</span>
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actionButtons}>
              <button type="button" className={styles.saveButton} onClick={save} disabled={!canSave || saving}>
                <Icon name="save" />
                {saving ? <CowLoading label="Đang tải..." /> : "Lưu"}
              </button>
              <button type="button" className={styles.cancelButton} onClick={resetAndClose} disabled={saving}>
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
