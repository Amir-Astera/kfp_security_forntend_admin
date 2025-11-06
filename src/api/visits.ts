import { Visit, CreateVisitRequest, UpdateVisitRequest, VisitFilters, PaginatedResponse } from "../types";

// ============================================
// MOCK DATA
// ============================================

const mockVisits: Visit[] = [
  {
    id: "1",
    entryTime: "04.11.2025 08:15",
    exitTime: "04.11.2025 12:30",
    timeOnSite: "4ч 15м",
    fullName: "Иванов Петр Сергеевич",
    iin: "920315301234",
    company: "ТОО «Агро-Техника»",
    phone: "+7 727 250 1111",
    purpose: "Деловая встреча",
    places: ["Офис директора", "Конференц-зал"],
    hasVehicle: false,
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "1",
    checkpointName: "КПП-1 (Главный въезд)",
    guardId: "1",
    guardName: "Сергеев Иван Петрович",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    status: "left",
    createdAt: "04.11.2025 08:15",
    updatedAt: "04.11.2025 12:30",
  },
  {
    id: "2",
    entryTime: "04.11.2025 09:00",
    timeOnSite: "3ч 15м",
    fullName: "Смирнова Елена Викторовна",
    iin: "850620450123",
    company: "ИП «Консалт Плюс»",
    phone: "+7 727 250 2222",
    purpose: "Совещание",
    places: ["Отдел продаж"],
    hasVehicle: false,
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "1",
    checkpointName: "КПП-1 (Главный въезд)",
    guardId: "1",
    guardName: "Сергеев Иван Петрович",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    status: "on-site",
    createdAt: "04.11.2025 09:00",
  },
  {
    id: "3",
    entryTime: "04.11.2025 07:30",
    exitTime: "04.11.2025 08:45",
    timeOnSite: "1ч 15м",
    fullName: "Касымов Нурлан Бекович",
    iin: "780910301567",
    company: "ТОО «СтройСервис»",
    phone: "+7 727 250 3333",
    purpose: "Поставка товаров",
    places: ["Склад №1"],
    hasVehicle: true,
    vehicleNumber: "А123ВС01",
    techPassport: "KZ1234567",
    ttn: "TTN-2025-0012345",
    cargoType: "Стройматериалы",
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "2",
    checkpointName: "КПП-2 (Грузовой въезд)",
    guardId: "2",
    guardName: "Абдуллаев Марат Саматович",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    status: "left",
    createdAt: "04.11.2025 07:30",
    updatedAt: "04.11.2025 08:45",
  },
  {
    id: "4",
    entryTime: "04.11.2025 10:20",
    timeOnSite: "2ч 5м",
    fullName: "Жумабеков Асхат Маратович",
    iin: "930825601890",
    company: "ТОО «АгроЛидер»",
    phone: "+7 727 250 4444",
    purpose: "Обслуживание",
    places: ["Производство", "Цех №2"],
    hasVehicle: false,
    branchId: "2",
    branchName: "Астана - Северный",
    checkpointId: "5",
    checkpointName: "КПП-1 (Главный)",
    guardId: "5",
    guardName: "Петров Александр Иванович",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    status: "on-site",
    createdAt: "04.11.2025 10:20",
  },
  {
    id: "5",
    entryTime: "04.11.2025 06:00",
    exitTime: "04.11.2025 07:30",
    timeOnSite: "1ч 30м",
    fullName: "Султанова Айгуль Ержановна",
    iin: "880512450234",
    company: "ТОО «Продукты Плюс»",
    phone: "+7 727 250 5555",
    purpose: "Поставка товаров",
    places: ["Склад готовой продукции"],
    hasVehicle: true,
    vehicleNumber: "В456КХ02",
    techPassport: "KZ7654321",
    ttn: "TTN-2025-0012346",
    cargoType: "Продукция",
    branchId: "3",
    branchName: "Шымкент - Южный филиал",
    checkpointId: "7",
    checkpointName: "КПП-1",
    guardId: "7",
    guardName: "Ким Сергей Викторович",
    agencyId: "2",
    agencyName: "ТОО «Альфа-Охрана»",
    status: "left",
    createdAt: "04.11.2025 06:00",
    updatedAt: "04.11.2025 07:30",
  },
  {
    id: "6",
    entryTime: "04.11.2025 11:45",
    timeOnSite: "30м",
    fullName: "Ли Владимир Андреевич",
    iin: "950203701456",
    company: "ИП «Техсервис»",
    phone: "+7 727 250 6666",
    purpose: "Ремонтные работы",
    places: ["Административное здание"],
    hasVehicle: false,
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "4",
    checkpointName: "КПП-4 (Универсальный)",
    guardId: "3",
    guardName: "Турсунов Бахтияр Нурланович",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    status: "on-site",
    createdAt: "04.11.2025 11:45",
  },
  {
    id: "7",
    entryTime: "03.11.2025 14:00",
    exitTime: "03.11.2025 18:30",
    timeOnSite: "4ч 30м",
    fullName: "Мустафина Алия Ерлановна",
    iin: "870914302345",
    company: "АО «КазАгро»",
    phone: "+7 727 250 7777",
    purpose: "Инспекция",
    places: ["Производство", "Складские помещения", "Офис"],
    hasVehicle: false,
    branchId: "1",
    branchName: "Алматы - Центральный офис",
    checkpointId: "1",
    checkpointName: "КПП-1 (Главный въезд)",
    guardId: "1",
    guardName: "Сергеев Иван Петрович",
    agencyId: "1",
    agencyName: "ТОО «Казахстан Секьюрити»",
    status: "left",
    createdAt: "03.11.2025 14:00",
    updatedAt: "03.11.2025 18:30",
  },
  {
    id: "8",
    entryTime: "03.11.2025 09:15",
    exitTime: "03.11.2025 11:00",
    timeOnSite: "1ч 45м",
    fullName: "Нурланов Ерлан Асхатович",
    iin: "920620501678",
    company: "ТОО «УдобренияКЗ»",
    phone: "+7 727 250 8888",
    purpose: "Поставка товаров",
    places: ["Склад №3"],
    hasVehicle: true,
    vehicleNumber: "К789МН05",
    techPassport: "KZ9876543",
    ttn: "TTN-2025-0012347",
    cargoType: "Удобрения",
    branchId: "5",
    branchName: "Актобе - Западный",
    checkpointId: "10",
    checkpointName: "КПП-2",
    guardId: "10",
    guardName: "Жанабаев Ержан Болатович",
    agencyId: "3",
    agencyName: "АО «БезопасностьПлюс»",
    status: "left",
    createdAt: "03.11.2025 09:15",
    updatedAt: "03.11.2025 11:00",
  },
];

// ============================================
// API FUNCTIONS (MOCK IMPLEMENTATION)
// ============================================

/**
 * Получить список визитов с фильтрами и пагинацией
 */
export async function getVisits(
  filters?: VisitFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Visit>> {
  // Имитация задержки API
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filteredVisits = [...mockVisits];

  // Применяем фильтры
  if (filters) {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredVisits = filteredVisits.filter(
        (visit) =>
          visit.fullName.toLowerCase().includes(searchLower) ||
          visit.iin.includes(searchLower) ||
          visit.company.toLowerCase().includes(searchLower) ||
          visit.phone.includes(searchLower) ||
          visit.vehicleNumber?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.branchId) {
      filteredVisits = filteredVisits.filter(
        (visit) => visit.branchId === filters.branchId
      );
    }

    if (filters.checkpointId) {
      filteredVisits = filteredVisits.filter(
        (visit) => visit.checkpointId === filters.checkpointId
      );
    }

    if (filters.agencyId) {
      filteredVisits = filteredVisits.filter(
        (visit) => visit.agencyId === filters.agencyId
      );
    }

    if (filters.status && filters.status !== "all") {
      filteredVisits = filteredVisits.filter(
        (visit) => visit.status === filters.status
      );
    }

    if (filters.hasVehicle !== undefined) {
      filteredVisits = filteredVisits.filter(
        (visit) => visit.hasVehicle === filters.hasVehicle
      );
    }

    if (filters.purpose) {
      filteredVisits = filteredVisits.filter(
        (visit) => visit.purpose === filters.purpose
      );
    }

    // Фильтр по датам (упрощенная реализация)
    if (filters.dateFrom || filters.dateTo) {
      // В реальном API здесь будет сравнение дат
      // Пока оставим как есть для мока
    }
  }

  // Пагинация
  const total = filteredVisits.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filteredVisits.slice(start, end);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Получить визит по ID
 */
export async function getVisitById(id: string): Promise<Visit | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockVisits.find((visit) => visit.id === id) || null;
}

/**
 * Создать новый визит
 */
export async function createVisit(data: CreateVisitRequest): Promise<Visit> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // В реальном API здесь будет POST запрос
  const newVisit: Visit = {
    id: String(mockVisits.length + 1),
    ...data,
    entryTime: new Date().toLocaleString("ru-RU"),
    status: "on-site",
    createdAt: new Date().toLocaleString("ru-RU"),
    // Получить названия из ID (в реальном API это придет с бэкенда)
    branchName: "Название филиала",
    checkpointName: "Название КПП",
    guardName: "Имя охранника",
    agencyName: "Название агентства",
  };

  mockVisits.push(newVisit);
  return newVisit;
}

/**
 * Обновить визит
 */
export async function updateVisit(
  id: string,
  data: UpdateVisitRequest
): Promise<Visit> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // В реальном API здесь будет PUT/PATCH запрос
  const index = mockVisits.findIndex((visit) => visit.id === id);
  if (index === -1) {
    throw new Error("Visit not found");
  }

  // Расчет времени на территории при выходе
  let timeOnSite = mockVisits[index].timeOnSite;
  if (data.exitTime && !mockVisits[index].exitTime) {
    // Простой расчет (в реальном API это будет на бэкенде)
    timeOnSite = "Рассчитано";
  }

  mockVisits[index] = {
    ...mockVisits[index],
    ...data,
    timeOnSite,
    updatedAt: new Date().toLocaleString("ru-RU"),
  };

  return mockVisits[index];
}

/**
 * Зарегистрировать выход (завершить визит)
 */
export async function checkoutVisit(id: string): Promise<Visit> {
  return updateVisit(id, {
    exitTime: new Date().toLocaleString("ru-RU"),
    status: "left",
  });
}

/**
 * Удалить визит (для суперадмина)
 */
export async function deleteVisit(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  // В реальном API здесь будет DELETE запрос
  const index = mockVisits.findIndex((visit) => visit.id === id);
  if (index !== -1) {
    mockVisits.splice(index, 1);
  }
}

/**
 * Экспорт визитов в Excel (возвращает URL для скачивания)
 */
export async function exportVisits(filters?: VisitFilters): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // В реальном API здесь будет запрос на генерацию Excel файла
  // Возвращает URL для скачивания
  return "/api/exports/visits-2025-11-04.xlsx";
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Получить уникальные цели визитов
 */
export function getVisitPurposes(): string[] {
  return [
    "Деловая встреча",
    "Поставка товаров",
    "Обслуживание",
    "Совещание",
    "Инспекция",
    "Ремонтные работы",
    "Прочее",
  ];
}

/**
 * Получить типы грузов
 */
export function getCargoTypes(): string[] {
  return [
    "Сельхозтехника",
    "Удобрения",
    "Семена",
    "Корма",
    "Оборудование",
    "Стройматериалы",
    "Продукция",
    "Запчасти",
    "Прочее",
  ];
}
