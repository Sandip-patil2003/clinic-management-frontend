import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';

export interface VisitRecord {
  id?: string;
  patientId: string;
  patientName?: string;
  mobile?: string;
  complaint: string;
  notes: string;
  visitDate?: string;
}

export interface VisitCreateResponse {
  visitId: {
    visitId: string;
    patientGuid: string;
    visitDate: string;
    complaint: string;
    notes: string;
  };
}

export interface CreateVisit {
  patientId: string;
  complaint: string;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class VisitService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getVisits(): Observable<VisitRecord[]> {
    return this.http.get<VisitRecord[]>(`${this.baseUrl}/visits`);
  }

  addVisit(request: CreateVisit): Observable<VisitCreateResponse> {
    return this.http.post<VisitCreateResponse>(`${this.baseUrl}/visits`, request);
  }

  deleteVisit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/visits/${id}`);
  }
}
