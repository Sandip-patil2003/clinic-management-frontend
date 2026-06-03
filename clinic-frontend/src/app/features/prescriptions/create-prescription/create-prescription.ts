import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, startWith, map, tap } from 'rxjs';
import { PrescriptionService, PrescriptionRequest, Medicine, Therapy } from '../../../core/services/prescription-service';

@Component({
  selector: 'app-create-prescription',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  templateUrl: './create-prescription.html',
  styleUrls: ['./create-prescription.scss']
})
export class CreatePrescription implements OnInit {
  prescriptionForm!: FormGroup;
  visitReference = {
    patientName: '',
    visitId: '',
    visitDate: '',
    complaint: ''
  };

  minFollowUpDate = new Date();
  medicinesList: Medicine[] = [];
  therapiesList: Therapy[] = [];
  filteredMedicines: Observable<Medicine[]>[] = [];
  filteredTherapies: Observable<Therapy[]>[] = [];

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private prescriptionService = inject(PrescriptionService);

  ngOnInit(): void {
    this.initForm();
    this.loadOptions();
    this.route.queryParams.subscribe(params => {
      this.visitReference = {
        patientName: params['patientName'] ?? '',
        visitId: params['visitId'] ?? '',
        visitDate: params['visitDate'] ?? '',
        complaint: params['complaint'] ?? ''
      };
    });
  }

  initForm(): void {
    this.prescriptionForm = this.fb.group({
      notes: [''],
      nextFollowUpDate: [''],
      medicines: this.fb.array([]),
      therapies: this.fb.array([])
    });

    this.addMedicine();
  }

  get medicines(): FormArray {
    return this.prescriptionForm.get('medicines') as FormArray;
  }

  get therapies(): FormArray {
    return this.prescriptionForm.get('therapies') as FormArray;
  }

  loadOptions(): void {
    this.prescriptionService.getMedicines().subscribe({
      next: medicines => {
        this.medicinesList = medicines || [];
      },
      error: err => {
        console.error('Error loading medicines', err);
      }
    });

    this.prescriptionService.getTherapies().subscribe({
      next: therapies => {
        this.therapiesList = therapies || [];
      },
      error: err => {
        console.error('Error loading therapies', err);
      }
    });
  }

  setupMedicineAutocomplete(group: FormGroup, index: number): void {
    const control = group.get('medicineName') as FormControl;

    this.filteredMedicines[index] = control.valueChanges.pipe(
      startWith(control.value ?? ''),
      tap(value => {
        if (typeof value === 'string') {
          group.get('medicineId')?.setValue(null, { emitEvent: false });
        }
      }),
      map(value => typeof value === 'string' ? value : value.name),
      map(value => this.filterMedicines(value))
    );
  }

  setupTherapyAutocomplete(group: FormGroup, index: number): void {
    const control = group.get('therapyName') as FormControl;

    this.filteredTherapies[index] = control.valueChanges.pipe(
      startWith(control.value ?? ''),
      tap(value => {
        if (typeof value === 'string') {
          group.get('therapyId')?.setValue(null, { emitEvent: false });
        }
      }),
      map(value => typeof value === 'string' ? value : value.name),
      map(value => this.filterTherapies(value))
    );
  }

  filterMedicines(value: string): Medicine[] {
    const filterValue = value.toLowerCase().trim();
    return filterValue ? this.medicinesList.filter(m => m.name.toLowerCase().includes(filterValue)) : [...this.medicinesList];
  }

  filterTherapies(value: string): Therapy[] {
    const filterValue = value.toLowerCase().trim();
    return filterValue ? this.therapiesList.filter(t => t.name.toLowerCase().includes(filterValue)) : [...this.therapiesList];
  }

  displayMedicineName(value: Medicine | string): string {
    return typeof value === 'string' ? value : value?.name ?? '';
  }

  displayTherapyName(value: Therapy | string): string {
    return typeof value === 'string' ? value : value?.name ?? '';
  }

  onMedicineSelected(event: MatAutocompleteSelectedEvent, index: number): void {
    const selected = event.option.value as Medicine;
    const group = this.medicines.at(index) as FormGroup;
    console.log('Selected Medicine:', selected);
    group.get('medicineId')?.setValue(selected.medicineId, { emitEvent: false });
    console.log('MedicineId after set:', group.get('medicineId')?.value);
    group.get('medicineName')?.setValue(selected, { emitEvent: false });
  }

  onTherapySelected(event: MatAutocompleteSelectedEvent, index: number): void {
    const selected = event.option.value as Therapy;
    const group = this.therapies.at(index) as FormGroup;
    console.debug(`Therapy selected (index=${index})`, selected);
    group.get('therapyId')?.setValue(selected.id, { emitEvent: false });
    group.get('therapyName')?.setValue(selected, { emitEvent: false });
  }

  createMedicineGroup(): FormGroup {
    return this.fb.group({
      medicineId: [null],
      medicineName: ['', Validators.required],
      dosage: ['', Validators.required],
      frequency: ['', Validators.required],
      durationDays: ['', Validators.required],
      instructions: ['']
    });
  }

  createTherapyGroup(): FormGroup {
    return this.fb.group({
      therapyId: [null],
      therapyName: [''],
      sessions: [''],
      notes: ['']
    });
  }

  addMedicine(): void {
    const group = this.createMedicineGroup();
    this.medicines.push(group);
    this.setupMedicineAutocomplete(group, this.medicines.length - 1);
  }

  removeMedicine(index: number): void {
    if (this.medicines.length > 1) {
      this.medicines.removeAt(index);
      this.filteredMedicines.splice(index, 1);
    }
  }

  addTherapy(): void {
    const group = this.createTherapyGroup();
    this.therapies.push(group);
    this.setupTherapyAutocomplete(group, this.therapies.length - 1);
  }

  removeTherapy(index: number): void {
    this.therapies.removeAt(index);
    this.filteredTherapies.splice(index, 1);
  }

  savePrescription(): void {
    if (!this.visitReference.visitId || this.prescriptionForm.invalid) {
      return;
    }

    // Debug: print current medicine controls to help diagnose missing IDs
    console.debug('Saving prescription - medicines controls:', this.medicines.controls.map(c => c.value));

    const nextFollowUpValue = this.prescriptionForm.value.nextFollowUpDate;
    const nextFollowUpDate = nextFollowUpValue instanceof Date ? nextFollowUpValue.toISOString() : nextFollowUpValue;

    const request: PrescriptionRequest = {
      visitId: this.visitReference.visitId,
      notes: this.prescriptionForm.value.notes,
      nextFollowUpDate,
      medicines: this.medicines.controls.map(control => {
        const mv = control.value.medicineName;
        const explicitId = control.value.medicineId;
        const idFromObject = mv && typeof mv === 'object' ? (mv as Medicine).medicineId : undefined;
        const idFromName = typeof mv === 'string' ? this.medicinesList.find(m => m.name.toLowerCase() === mv.toLowerCase())?.medicineId : undefined;
        const resolvedMedicineId = explicitId ?? idFromObject ?? idFromName ?? 0;

        return {
          medicineId: resolvedMedicineId,
          dosage: control.value.dosage,
          frequency: control.value.frequency,
          durationDays: String(control.value.durationDays ?? ''),
          instructions: control.value.instructions
        };
      }),
      therapies: this.therapies.controls.map(control => {
        const tv = control.value.therapyName;
        const explicitTid = control.value.therapyId;
        const idFromObjectT = tv && typeof tv === 'object' ? (tv as Therapy).id : undefined;
        const idFromNameT = typeof tv === 'string' ? this.therapiesList.find(t => t.name.toLowerCase() === tv.toLowerCase())?.id : undefined;
        const resolvedTherapyId = explicitTid ?? idFromObjectT ?? idFromNameT ?? 0;

        return {
          therapyId: resolvedTherapyId,
          sessions: control.value.sessions ? Number(control.value.sessions) : 0,
          notes: control.value.notes
        };
      })
    };
    console.log(this.medicines.value);
    this.prescriptionService.createPrescription(request).subscribe({
      next: () => this.router.navigate(['/visits']),
      error: err => {
        console.error('Error creating prescription', err);
      } 
    });
  }

  cancel(): void {
    this.router.navigate(['/visits']);
  }
}
