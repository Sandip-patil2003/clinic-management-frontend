import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';

export interface PrescriptionMedicine {
  medicineId: number | null;
  dosage: string;
  frequency: string;
  instructions?: string;
  durationDays: string;
}

export interface PrescriptionTherapy {
  therapyId: number | null;
  sessions: number | null;
  notes?: string;
}

export interface Medicine {
  medicineId: number;
  name: string;
}

export interface Therapy {
  id: number;
  name: string;
}

export interface PrescriptionRequest {
  visitId: string;
  notes?: string;
  nextFollowUpDate?: string;
  medicines: PrescriptionMedicine[];
  therapies: PrescriptionTherapy[];
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  createPrescription(request: PrescriptionRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/prescription`, request);
  }

  getMedicines(): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(`${this.baseUrl}/Medicine`);
  }

  getTherapies(): Observable<Therapy[]> {
    return this.http.get<Therapy[]>(`${this.baseUrl}/Therapy`);
  }
}
