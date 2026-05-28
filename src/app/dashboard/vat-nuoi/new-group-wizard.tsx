"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./new-group-wizard.module.css";

export type LivestockZoneOption = {
  id: string;
  name: string;
};

type TagItem = {
  id: string;
  type: string;
  label: string;
  color: string;
  location: string;
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
  tags: TagItem[];
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
  tagTypes: string[];
  tagLocations: string[];
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
    earTypes: ["Bình thường", "Tai cụp", "Có thẻ tai"],
    hornTypes: ["Không sừng", "Có sừng", "Cắt sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng", "Tổn thương nhẹ"],
    tagTypes: ["RFID", "Thẻ tai trực quan", "Vòng cổ", "Số quản lý"],
    tagLocations: ["Tai trái", "Tai phải", "Cổ", "Hồ sơ nhóm"],
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
      primaryIdentification: "RFID",
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
    earTypes: ["Bình thường", "Tai cụp", "Có thẻ tai"],
    hornTypes: ["Có sừng", "Cắt sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng"],
    tagTypes: ["RFID", "Thẻ tai trực quan", "Vòng cổ", "Số quản lý"],
    tagLocations: ["Tai trái", "Tai phải", "Cổ", "Hồ sơ nhóm"],
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
      primaryIdentification: "RFID",
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
    tagTypes: ["Thẻ tai trực quan", "Số quản lý", "Vòng cổ"],
    tagLocations: ["Tai trái", "Tai phải", "Cổ", "Hồ sơ nhóm"],
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
      primaryIdentification: "Thẻ tai trực quan",
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
    earTypes: ["Bình thường", "Tai cụp", "Có thẻ tai"],
    hornTypes: ["Không sừng", "Có sừng"],
    mouths: ["Bình thường", "Cần kiểm tra răng"],
    tagTypes: ["Thẻ tai trực quan", "RFID", "Số quản lý"],
    tagLocations: ["Tai trái", "Tai phải", "Hồ sơ nhóm"],
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
      primaryIdentification: "Thẻ tai trực quan",
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
    tagTypes: ["Số tai", "RFID", "Mã đàn", "Số quản lý"],
    tagLocations: ["Tai trái", "Tai phải", "Hồ sơ nhóm"],
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
      primaryIdentification: "Số tai",
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
    tagTypes: ["Vòng chân", "Mã đàn", "Số quản lý"],
    tagLocations: ["Chân trái", "Chân phải", "Hồ sơ nhóm"],
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
      primaryIdentification: "Mã đàn",
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
    tagTypes: ["Vòng chân", "Mã đàn", "Số quản lý"],
    tagLocations: ["Chân trái", "Chân phải", "Hồ sơ nhóm"],
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
      primaryIdentification: "Mã đàn",
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
    tagTypes: ["Mã lô ao", "PIT tag", "Số quản lý"],
    tagLocations: ["Hồ sơ nhóm", "Ao nuôi", "Bể nuôi"],
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
      primaryIdentification: "Mã lô ao",
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
    title: "Nhận diện",
    icon: "id",
    desc: "Thông tin nhận diện chính và các thẻ quản lý.",
    items: ["Nhận diện chính", "Danh sách thẻ"],
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

function addMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function defaultGroupName(profile: SpeciesProfile) {
  return `${profile.groupPrefix} ${new Date().getFullYear()}`;
}

function makeTag(profile: SpeciesProfile, index = 0): TagItem {
  const type = profile.tagTypes[index] ?? profile.tagTypes[0] ?? "Số quản lý";
  return {
    id: crypto.randomUUID(),
    type,
    label: index === 0 ? type : "Thẻ quản lý",
    color: index === 0 ? "Trắng" : "Khác",
    location: profile.tagLocations[index] ?? profile.tagLocations[0] ?? "Hồ sơ nhóm",
  };
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
    tags: [makeTag(profile, 0), makeTag(profile, 1)],
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
      tags: [makeTag(nextProfile, 0), makeTag(nextProfile, 1)],
      ...nextProfile.defaults,
    }));
  };

  const updateTag = (id: string, key: keyof Omit<TagItem, "id">, value: string) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.map((tag) => {
        if (tag.id !== id) return tag;
        const updated = { ...tag, [key]: value };
        if (key === "type" && !tag.label) updated.label = value;
        return updated;
      }),
    }));
  };

  const addTag = () => {
    setForm((current) => ({ ...current, tags: [...current.tags, makeTag(profile, current.tags.length)] }));
  };

  const removeTag = (id: string) => {
    setForm((current) => ({ ...current, tags: current.tags.filter((tag) => tag.id !== id) }));
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
            <div className={styles.photoArt} aria-hidden="true" />
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
                  Chọn loài vật nuôi trước, hệ thống sẽ tự điền giống, thông số sinh trưởng và thông tin nhận diện phù hợp cho nhóm mới.
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
              <>
                <Field label="Nhận diện chính" required>
                  <Select value={form.primaryIdentification} options={profile.tagTypes} onChange={(value) => update("primaryIdentification", value)} />
                </Field>
                <div className={styles.tagArea}>
                  <span className={styles.tagAreaLabel}>Danh sách thẻ</span>
                  <div className={styles.tagList}>
                    {form.tags.map((tag) => (
                      <div key={tag.id} className={styles.tagCard}>
                        <label>
                          <span>Loại</span>
                          <Select value={tag.type} options={profile.tagTypes} onChange={(value) => updateTag(tag.id, "type", value)} />
                        </label>
                        <label>
                          <span>Mã/nhãn</span>
                          <input value={tag.label} onChange={(event) => updateTag(tag.id, "label", event.target.value)} />
                        </label>
                        <label>
                          <span>Màu sắc</span>
                          <Select value={tag.color} options={["Trắng", "Vàng", "Đỏ", "Xanh", "Khác"]} onChange={(value) => updateTag(tag.id, "color", value)} />
                        </label>
                        <label>
                          <span>Vị trí</span>
                          <Select value={tag.location} options={profile.tagLocations} onChange={(value) => updateTag(tag.id, "location", value)} />
                        </label>
                        <button type="button" className={styles.deleteTag} onClick={() => removeTag(tag.id)} aria-label="Xóa thẻ">
                          <Icon name="close" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className={styles.addTag} onClick={addTag}>
                    + Thêm thẻ
                  </button>
                </div>
              </>
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
                {saving ? "Đang lưu..." : "Lưu"}
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
