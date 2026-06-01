import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { CreatePatient } from '../../../shared/model/Patient/create-patient.model';
import { Router } from '@angular/router';
import { PatientService } from '../../../core/services/patient-service';
import { ToastrService } from 'ngx-toastr';


// ── Custom Validators ──────────────────────────────────────────────────────────

/** Rejects any value that contains a digit (0-9) */
export const noNumbersValidator: ValidatorFn = (control: AbstractControl) => {
  if (!control.value) return null;
  return /\d/.test(control.value) ? { hasNumbers: true } : null;
};

/** Allows only digits (no letters, spaces, or symbols) */
export const digitsOnlyValidator: ValidatorFn = (control: AbstractControl) => {
  if (!control.value && control.value !== 0) return null;
  const strVal = String(control.value);
  return /^\d+$/.test(strVal) ? null : { digitsOnly: true };
};


@Component({
  selector: 'app-add-patient',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatIconModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './add-patient.html',
  styleUrl: './add-patient.scss',
})
export class AddPatient {

  patientForm!: FormGroup;
  patientId?: string;
  isEditMode = false;
  pageTitle = 'Add Patient';
  actionLabel = 'Add Patient';
  private toastr = inject(ToastrService);

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;

      this.patientId = id;
      this.isEditMode = true;
      this.pageTitle = 'Edit Patient';
      this.actionLabel = 'Update Patient';

      this.patientService.getPatientById(id).subscribe({
        next: (patient) => {
          this.patientForm.patchValue({
            name: patient.name,
            gender: patient.gender?.toLowerCase(),
            age: patient.age,
            mobile: patient.mobile,
            bloodGroup: patient.bloodGroup ?? '',
            concern: (patient as any).concern ?? '',
            address: {
              street: patient.address?.street ?? '',
              city: patient.address?.city ?? '',
              pincode: patient.address?.pincode ?? ''
            }
          });
        },
        error: (err) => {
          console.error('Error loading patient', err);
          this.toastr.error('Failed to load patient details');
        }
      });
    });
  }

  initForm() {
    this.patientForm = this.fb.group({
      // Full name: required + no numbers allowed
      name: ['', [Validators.required, noNumbersValidator]],

      // Gender: required
      gender: ['', Validators.required],

      // Age: required + digits only
      age: [null, [Validators.required, digitsOnlyValidator]],

      // Mobile: required + digits only + exactly 10 digits
      mobile: ['', [
        Validators.required,
        digitsOnlyValidator,
        Validators.minLength(10),
        Validators.maxLength(10)
      ]],

      // Blood group: optional
      bloodGroup: [''],

      concern: [''],

      address: this.fb.group({
        street: [''],
        city: [''],
        pincode: ['']
      })
    });
  }

  // ── Convenience getters for template ──────────────────────────────────────

  get nameControl() { return this.patientForm.get('name')!; }
  get genderControl() { return this.patientForm.get('gender')!; }
  get ageControl() { return this.patientForm.get('age')!; }
  get mobileControl() { return this.patientForm.get('mobile')!; }

  // ── Prevent non-digit keystrokes on numeric fields ─────────────────────────

  onlyDigitsKeydown(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Also block paste of non-digit content on mobile field */
  onMobilePaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^\d+$/.test(pasted) || pasted.length > 10) {
      event.preventDefault();
    }
  }

  // ── Enforce max-length while typing (mobile = 10 digits) ──────────────────

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 10) {
      input.value = input.value.slice(0, 10);
      this.mobileControl.setValue(input.value, { emitEvent: false });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  onSubmit() {
    if (this.patientForm.invalid) return;

    const formValue = this.patientForm.value;
    formValue.gender = formValue.gender === 'male' ? 'Male' : 'Female';

    const address = formValue.address;
    const hasAddress = address && (address.street?.trim() || address.city?.trim() || address.pincode?.trim());

    const request: CreatePatient = {
      ...formValue,
      address: hasAddress
        ? {
            street: address.street?.trim() ?? '',
            city: address.city?.trim() ?? '',
            pincode: address.pincode?.trim() ?? ''
          }
        : null
    } as CreatePatient;

    if (this.patientId) {
      this.patientService.updatePatient(this.patientId, request).subscribe({
        next: (res) => {
          this.toastr.success('Patient updated successfully');
          this.router.navigate(['/patients-list']);
        },
        error: (err) => {
          console.error('Update Error:', err);
          this.toastr.error('Failed to update patient');
        }
      });
      return;
    }

    this.patientService.addPatient(request).subscribe({
      next: (res) => {
        this.toastr.success('Patient added successfully');
        this.router.navigate(['/patients-list']);
      },
      error: (err) => {
        console.error('Error:', err);
        this.toastr.error('Failed to add patient');
      }
    });
  }

  goBack() {
    this.router.navigate(['/patients-list']);
  }
}