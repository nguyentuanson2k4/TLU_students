import { ServiceRequestStatus } from '../enums';

export class ServiceRequestResponseDto {
  id: number;
  user_id: number;
  document_type_id: number;
  reason?: string;
  attachment_url?: string;
  status: ServiceRequestStatus;
  created_at: Date;
  updated_at?: Date;
  document_type?: {
    id: number;
    document_name: string;
    processing_days?: number;
  };
}
