export interface IEmployee {
  employeeId: number;
  alternCode: string;
  lastName: string;
  firstName: string;
  dateOfBirth?: Date | string | null;
  createdOn?: Date | string | null;
  createdBy?: string | null;
  deactivated?: boolean | null;
  status: number;
  identificationNumber?: string | null;
  socialSecurityNumber?: string | null;
  gender?: string | null;
  paymentType?: number | null;
  paymentAmount?: number | null;
  bank?: string | null;
  /** Maps to hr_employee.BanckAccount (DB column spelling). */
  banckAccount?: string | null;
  jobId?: number | null;
  maritalStatus?: number | null;
  payrollType?: number | null;
  profession?: string | null;
  classId?: number | null;
  accountId?: number | null;
  organizationId: number;
}
