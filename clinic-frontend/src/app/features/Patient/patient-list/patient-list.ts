// patient-list.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import {
  Observable,
  combineLatest,
  Subject,
} from 'rxjs';
import {
  map,
  startWith,
  takeUntil,
} from 'rxjs/operators';
import { PatientService, Patient } from '../../../core/services/patient-service';
import { PatientDetailsDialog } from './patient-details-dialog';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.scss',
})
export class PatientList implements OnInit, OnDestroy {

  private router   = inject(Router);
  private patientService = inject(PatientService);
  private dialog   = inject(MatDialog);
  private destroy$ = new Subject<void>();

  // ── Form Controls ─────────────────────────────────────────
  searchControl = new FormControl<string>('');
  genderFilter  = new FormControl<string>('');
  ageFilter     = new FormControl<string>('');

  // ── Streams ───────────────────────────────────────────────
  private allPatients$!: Observable<Patient[]>;
  filteredPatients$!: Observable<Patient[]>;

  // ── Computed flag for "Clear Filters" button ──────────────
  get hasActiveFilters(): boolean {
    return !!(
      this.searchControl.value?.trim() ||
      this.genderFilter.value ||
      this.ageFilter.value
    );
  }

  // ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.allPatients$ = this.patientService.getPatients();

    // Combine the patient list with all three filter streams
    this.filteredPatients$ = combineLatest([
      this.allPatients$,
      this.searchControl.valueChanges.pipe(startWith('')),
      this.genderFilter.valueChanges.pipe(startWith('')),
      this.ageFilter.valueChanges.pipe(startWith('')),
    ]).pipe(
      takeUntil(this.destroy$),
      map(([patients, search, gender, ageRange]) =>
        this.applyFilters(patients, search ?? '', gender ?? '', ageRange ?? '')
      )
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filter Logic ──────────────────────────────────────────
  private applyFilters(
    patients: Patient[],
    search: string,
    gender: string,
    ageRange: string
  ): Patient[] {
    const q = search.toLowerCase().trim();

    return patients.filter((p) => {
      // 1. Text search: name or mobile
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.mobile?.toString().includes(q);

      // 2. Gender filter
      const matchesGender =
        !gender ||
        p.gender?.toLowerCase().trim() === gender.toLowerCase();

      // 3. Age range filter
      const matchesAge = !ageRange || this.matchesAgeRange(p.age, ageRange);

      return matchesSearch && matchesGender && matchesAge;
    });
  }

  private matchesAgeRange(age: number | undefined, range: string): boolean {
    if (age === undefined || age === null) return false;

    switch (range) {
      case '0-18':  return age >= 0  && age <= 18;
      case '19-30': return age >= 19 && age <= 30;
      case '31-50': return age >= 31 && age <= 50;
      case '51+':   return age >= 51;
      default:      return true;
    }
  }

  // ── Actions ───────────────────────────────────────────────
  clearFilters(): void {
    this.searchControl.setValue('');
    this.genderFilter.setValue('');
    this.ageFilter.setValue('');
  }

  openPatientDetails(patientId: string | undefined): void {
    if (!patientId) {
      console.warn('Patient ID missing. Cannot open details dialog.');
      return;
    }
    this.dialog.open(PatientDetailsDialog, {
      width: '560px',
      data: { id: patientId },
    });
  }
}