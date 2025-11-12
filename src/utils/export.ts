import { toast } from "sonner@2.0.3";
import type { Visit, Guard, Branch, Checkpoint, Agency } from "../types";

/**
 * Экспорт данных в CSV формат
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    toast.error("Нет данных для экспорта");
    return;
  }

  // Получаем заголовки из первого объекта
  const headers = Object.keys(data[0]);
  
  // Формируем CSV контент
  const csvContent = [
    headers.join(","), // Заголовки
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Экранируем значения с запятыми и кавычками
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  // Создаем и скачиваем файл
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success(`Экспортировано ${data.length} записей`);
}

/**
 * Экспорт визитов
 */
export function exportVisits(visits: Visit[]) {
  const data = visits.map(visit => ({
    "Дата въезда": visit.entryDate,
    "Время въезда": visit.entryTime,
    "ФИО": visit.fullName,
    "ИИН": visit.iin,
    "Телефон": visit.phone,
    "Компания": visit.company,
    "Филиал": visit.branchName,
    "КПП": visit.checkpointName,
    "Охранник": visit.guardName,
    "Цель визита": visit.purpose,
    "Транспорт": visit.hasVehicle ? "Да" : "Нет",
    "Гос. номер": visit.vehicleNumber || "",
    "Тип груза": visit.cargoType || "",
    "Статус": visit.status === "on-site" ? "На территории" : "Покинул",
    "Время выезда": visit.exitTime || "",
    "Примечания": visit.notes || "",
  }));

  exportToCSV(data, `visits_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Экспорт охранников
 */
export function exportGuards(guards: Guard[]) {
  const data = guards.map(guard => ({
    "ФИО": guard.fullName,
    "ИИН": guard.iin,
    "Телефон": guard.phone,
    "Email": guard.email || "",
    "Агентство": guard.agencyName,
    "Филиал": guard.branchName,
    "КПП": guard.checkpointName,
    "Смена": guard.shiftType === "day" ? "Дневная" : "Ночная",
    "Время смены": `${guard.shiftStart}-${guard.shiftEnd}`,
    "Дата найма": guard.hireDate,
    "Статус": guard.status === "active" ? "Активен" : "Неактивен",
    "Визитов": guard.visitsCount,
  }));

  exportToCSV(data, `guards_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Экспорт филиалов
 */
export function exportBranches(branches: Branch[]) {
  const data = branches.map(branch => ({
    "Название": branch.name,
    "Город": branch.city,
    "Регион": branch.region,
    "Адрес": `${branch.street}, ${branch.building}`,
    "Телефон": branch.phone,
    "Email": branch.email,
    "КПП": branch.checkpointsCount,
    "Дата создания": branch.createdAt,
    "Статус": branch.status === "active" ? "Активен" : "Неактивен",
  }));

  exportToCSV(data, `branches_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Экспорт КПП
 */
export function exportCheckpoints(checkpoints: Checkpoint[]) {
  const data = checkpoints.map(cp => ({
    "Название": cp.name,
    "Филиал": cp.branchName,
    "Тип": cp.type,
    "Координаты": cp.coordinates,
    "Рабочие часы": `${cp.workingHours.start}-${cp.workingHours.end}`,
    "Дата создания": cp.createdAt,
    "Статус": cp.status === "active" ? "Активен" : "Неактивен",
  }));

  exportToCSV(data, `checkpoints_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Экспорт агентств
 */
export function exportAgencies(agencies: Agency[]) {
  const data = agencies.map(agency => ({
    "Название": agency.name,
    "БИН": agency.bin,
    "Телефон": agency.phone,
    "Email": agency.email,
    "Адрес": agency.address,
    "Директор": agency.directorName,
    "Телефон директора": agency.directorPhone,
    "Email директора": agency.directorEmail,
    "Филиалов": agency.branches.length,
    "Охранников": agency.guardsCount,
    "Дата договора": agency.contractDate,
    "Статус": agency.status === "active" ? "Активен" : "Неактивен",
  }));

  exportToCSV(data, `agencies_${new Date().toISOString().split('T')[0]}`);
}
