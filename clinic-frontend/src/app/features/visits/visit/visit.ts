import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BehaviorSubject, debounceTime, distinctUntilChanged, map, startWith, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { Patient, PatientService } from '../../../core/services/patient-service';
import { CreateVisit, VisitRecord, VisitService } from '../../../core/services/visit-service';
import { VisitCreatedDialog } from './visit-created-dialog';

@Component({
  selector: 'app-visit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './visit.html',
  styleUrl: './visit.scss'
})
export class Visit implements OnInit {
  visitForm!: FormGroup;
  patientControl = new FormControl<Patient | string>('', Validators.required);
  searchControl = new FormControl('');
  sortControl = new FormControl('newest');
  dateRangeForm!: FormGroup;
  filteredPatients$ = new BehaviorSubject<Patient[]>([]);
  patients: Patient[] = [];

  get startDateControl(): FormControl {
    return this.dateRangeForm.get('startDate') as FormControl;
  }

  get endDateControl(): FormControl {
    return this.dateRangeForm.get('endDate') as FormControl;
  }
  allVisits: VisitRecord[] = [];
  pageVisits$ = new BehaviorSubject<VisitRecord[]>([]);
  selectedPatient: Patient | null = null;
  displayedColumns = ['patient', 'complaint', 'visitDate', 'action'];
  pageSizeOptions = [10, 20];
  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  pageCount = 1;

  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private visitService = inject(VisitService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  ngOnInit(): void {
    this.initForm();
    this.loadPatients();
    this.loadVisits();
    this.subscribeFilters();
  }

  initForm(): void {
    this.visitForm = this.fb.group({
      complaint: ['', Validators.required],
      notes: ['']
    });

    this.dateRangeForm = this.fb.group({
      startDate: [null],
      endDate: [null]
    });

    this.patientControl.valueChanges.pipe(
      startWith(''),
      tap(value => {
        if (typeof value === 'string') {
          this.selectedPatient = null;
        }
      }),
      map(value => (typeof value === 'string' ? value : value?.name ?? '')),
      map(value => this.filterPatients(value))
    ).subscribe(list => this.filteredPatients$.next(list));
  }

  subscribeFilters(): void {
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged(),
      tap(() => {
        this.currentPage = 1;
        this.applyFilters();
      })
    ).subscribe();

    this.sortControl.valueChanges.pipe(
      startWith(this.sortControl.value),
      tap(() => {
        this.currentPage = 1;
        this.applyFilters();
      })
    ).subscribe();

    this.dateRangeForm.valueChanges.pipe(
      tap(() => {
        this.currentPage = 1;
        this.applyFilters();
      })
    ).subscribe();
  }

  loadPatients(): void {
    this.patientService.getPatients().subscribe({
      next: patients => {
        this.patients = patients;
        this.filteredPatients$.next(patients);
      },
      error: err => {
        console.error('Error loading patients', err);
      }
    });
  }

  loadVisits(): void {
    this.visitService.getVisits().subscribe({
      next: visits => {
        this.allVisits = visits || [];
        this.applyFilters();
      },
      error: err => {
        console.error('Error loading visits', err);
      }
    });
  }

  filterPatients(value: string): Patient[] {
    const filterValue = value.toLowerCase().trim();
    if (!filterValue) {
      return this.patients.slice();
    }

    return this.patients.filter(patient => {
      return (
        patient.name.toLowerCase().includes(filterValue) ||
        patient.mobile.toLowerCase().includes(filterValue)
      );
    });
  }

  applyFilters(): void {
    let filtered = [...this.allVisits];
    const searchValue = this.searchControl.value?.toLowerCase().trim() ?? '';
    const { startDate, endDate } = this.dateRangeForm.value;

    if (searchValue) {
      filtered = filtered.filter(visit => {
        const patientName = visit.patientName?.toLowerCase() ?? '';
        const complaint = visit.complaint?.toLowerCase() ?? '';
        const notes = visit.notes?.toLowerCase() ?? '';
        const mobile = visit.mobile?.toLowerCase() ?? '';

        return (
          patientName.includes(searchValue) ||
          complaint.includes(searchValue) ||
          notes.includes(searchValue) ||
          mobile.includes(searchValue)
        );
      });
    }

    if (startDate) {
      const from = new Date(startDate);
      filtered = filtered.filter(visit => {
        const visitDate = visit.visitDate ? new Date(visit.visitDate) : null;
        return visitDate ? visitDate >= from : false;
      });
    }

    if (endDate) {
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(visit => {
        const visitDate = visit.visitDate ? new Date(visit.visitDate) : null;
        return visitDate ? visitDate <= to : false;
      });
    }

    filtered.sort((a, b) => {
      const dateA = a.visitDate ? new Date(a.visitDate).getTime() : 0;
      const dateB = b.visitDate ? new Date(b.visitDate).getTime() : 0;
      return this.sortControl.value === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    this.totalItems = filtered.length;
    this.pageCount = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.updatePage(filtered);
  }

  updatePage(filtered: VisitRecord[]): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pageVisits$.next(filtered.slice(startIndex, startIndex + this.pageSize));
  }

  changePage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.pageCount);
    this.applyFilters();
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }

  get pageStart(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.totalItems, this.currentPage * this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.pageCount }, (_, i) => i + 1);
  }

  clearFilters(): void {
    this.searchControl.reset('');
    this.dateRangeForm.reset({ startDate: '', endDate: '' });
    this.sortControl.setValue('newest');
    this.currentPage = 1;
    this.applyFilters();
  }

  displayPatient(patient: Patient | string): string {
    return typeof patient === 'string' ? patient : patient?.name ?? '';
  }

  onPatientSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedPatient = event.option.value as Patient;
  }

  saveVisit(): void {
    if (this.visitForm.invalid || !this.selectedPatient) {
      return;
    }

    const request: CreateVisit = {
      patientId: this.selectedPatient.patientId ?? this.selectedPatient.id ?? '',
      complaint: this.visitForm.value.complaint,
      notes: this.visitForm.value.notes
    };

    const patientName = this.selectedPatient.name;

    this.visitService.addVisit(request).subscribe({
      next: response => {
        const payload = response.visitId;
        const visit: VisitRecord = {
          id: payload.visitId,
          patientId: payload.patientGuid,
          complaint: payload.complaint,
          notes: payload.notes,
          visitDate: payload.visitDate
        };

        this.clearForm();
        this.loadVisits();
        this.openSuccessDialog(visit, patientName);
      },
      error: err => {
        console.error('Error saving visit', err);
        this.toastr.error('Unable to save visit. Please try again.', 'Error');
      }
    });
  }

  openSuccessDialog(visit: VisitRecord, patientName: string): void {
    const resolvedPatientName = patientName || visit.patientName || 'Patient';
    const visitDate = visit.visitDate ?? new Date().toISOString();

    const dialogRef = this.dialog.open(VisitCreatedDialog, {
      width: '560px',
      data: {
        visitId: visit.id ?? 'N/A',
        patientName: resolvedPatientName,
        patientId: visit.patientId,
        visitDate,
        complaint: visit.complaint,
        notes: visit.notes
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'addPrescription') {
        this.router.navigate(['/prescriptions'], {
          queryParams: {
            visitId: visit.id,
            patientId: visit.patientId,
            patientName,
            visitDate,
            complaint: visit.complaint
          }
        });
      }
    });
  }

  clearForm(): void {
    this.visitForm.reset();
    this.patientControl.reset();
    this.selectedPatient = null;
  }

  deleteVisit(visit: VisitRecord): void {
    if (!visit.id) {
      return;
    }

    this.visitService.deleteVisit(visit.id).subscribe({
      next: () => this.loadVisits(),
      error: err => {
        console.error('Error deleting visit', err);
      }
    });
  }

  viewVisit(visit: VisitRecord): void {
    console.log('View visit', visit);
  }

  editVisit(visit: VisitRecord): void {
    console.log('Edit visit', visit);
  }
}
