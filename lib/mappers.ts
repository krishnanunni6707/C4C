/**
 * Data Minimisation Mappers (P-07).
 * Ensures internal credentials, salts, hashes, and private identifiers
 * are never leaked in API responses.
 */

import { FirestoreUser, FirestorePrintJob, UserRole } from "@/lib/firebase/collections";

export interface PublicUser {
  id: string;
  name: string;
  admissionNumber: string;
  email?: string;
  phone?: string;
  role: UserRole;
  department?: string;
  semester?: number | string;
  locationId?: string | null;
  locationName?: string;
  disabled?: boolean;
  firstLogin?: boolean;
  createdAt?: any;
  updatedAt?: any;
  totalJobs?: number;
  totalAmountSpent?: number;
  printers?: string[];
}

export function toPublicUser(
  user: Partial<FirestoreUser> & Record<string, any>
): PublicUser {
  const {
    passwordHash: _ph,
    passwordSalt: _ps,
    tempPassword: _tp,
    ...rest
  } = user;

  const publicUser: PublicUser = {
    id: rest.id || "",
    name: rest.name || "",
    admissionNumber: rest.admissionNumber || "",
    role: (rest.role as UserRole) || "STUDENT",
    disabled: rest.status === "DISABLED" || !!rest.disabled,
    firstLogin: !!rest.firstLogin,
  };

  if (rest.email) publicUser.email = rest.email;
  if (rest.phone) publicUser.phone = rest.phone;
  if (rest.department) publicUser.department = rest.department;
  if (rest.semester !== undefined) publicUser.semester = rest.semester;
  if (rest.locationId !== undefined) publicUser.locationId = rest.locationId;
  if (rest.locationName) publicUser.locationName = rest.locationName;
  if (rest.createdAt) publicUser.createdAt = rest.createdAt;
  if (rest.updatedAt) publicUser.updatedAt = rest.updatedAt;
  if (typeof rest.totalJobs === "number") publicUser.totalJobs = rest.totalJobs;
  if (typeof rest.totalAmountSpent === "number") publicUser.totalAmountSpent = rest.totalAmountSpent;
  if (Array.isArray(rest.printers)) publicUser.printers = rest.printers;

  return publicUser;
}

export interface PublicPrintJob {
  id: string;
  tokenNumber: string;
  status: string;
  paymentStatus: string;
  totalPages: number;
  copies: number;
  colorMode: string;
  printType: string;
  paperSize: string;
  amount: number;
  locationId: string;
  locationName?: string;
  createdAt: any;
  updatedAt?: any;
  cancelledAt?: any;
  queuePosition?: number;
  fileName?: string;
  studentName?: string;
  admissionNumber?: string;
  refundStatus?: string;
  fileDeletedAt?: any;
}

export function toPublicJob(
  job: Partial<FirestorePrintJob> & Record<string, any>,
  options?: { isStudentView?: boolean }
): PublicPrintJob {
  const isStudent = options?.isStudentView ?? false;

  const publicJob: PublicPrintJob = {
    id: job.id || "",
    tokenNumber: job.tokenNumber || "",
    status: job.status || "WAITING",
    paymentStatus: job.paymentStatus || "UNPAID",
    totalPages: job.totalPages || 1,
    copies: job.copies || 1,
    colorMode: job.colorMode || "BW",
    printType: job.printType || "SINGLE",
    paperSize: job.paperSize || "A4",
    amount: job.amount || 0,
    locationId: job.locationId || "",
    createdAt: job.createdAt,
  };

  if (job.locationName) publicJob.locationName = job.locationName;
  if (job.updatedAt) publicJob.updatedAt = job.updatedAt;
  if (job.cancelledAt) publicJob.cancelledAt = job.cancelledAt;
  if (typeof job.queuePosition === "number") publicJob.queuePosition = job.queuePosition;
  if (job.fileName) publicJob.fileName = job.fileName;
  if (job.refundStatus) publicJob.refundStatus = job.refundStatus;
  if (job.fileDeletedAt) publicJob.fileDeletedAt = job.fileDeletedAt;

  // On administrative views, retain student identification; on student views, include only if own job
  if (!isStudent) {
    if (job.studentName) publicJob.studentName = job.studentName;
    if (job.admissionNumber) publicJob.admissionNumber = job.admissionNumber;
  } else {
    if (job.studentName) publicJob.studentName = job.studentName;
    if (job.admissionNumber) publicJob.admissionNumber = job.admissionNumber;
  }

  return publicJob;
}
