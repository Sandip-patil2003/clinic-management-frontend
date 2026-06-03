import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface VisitCreatedDialogData {
  visitId: string;
  patientName: string;
  patientId: string;
  visitDate: string;
  complaint: string;
  notes: string;
}

@Component({
  selector: 'app-visit-created-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './visit-created-dialog.html',
  styleUrls: ['./visit-created-dialog.scss']
})
export class VisitCreatedDialog {
  private dialogRef = inject(MatDialogRef<VisitCreatedDialog>);
  data = inject(MAT_DIALOG_DATA) as VisitCreatedDialogData;

  close() {
    this.dialogRef.close();
  }

  addPrescription() {
    this.dialogRef.close('addPrescription');
  }
}
