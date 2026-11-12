import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ContractSignatureAdminService, SignatureManagement, ContractInvitationAdmin } from '../../services/contract-signature-admin.service';

@Component({
  selector: 'app-contract-signatures',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contract-signatures.component.html',
})
export class ContractSignaturesComponent {
  private readonly api = inject(ContractSignatureAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly documentRef = inject(DOCUMENT);
  readonly contractId = Number(this.route.snapshot.paramMap.get('id'));
  readonly data = signal<SignatureManagement | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly expandedAudit = signal(false);
  signerName = '';
  signerEmail = '';
  signerRole: 'client' | 'provider' = 'client';
  documentId: number | null = null;

  constructor() { this.refresh(); }

  refresh(): void {
    if (!Number.isSafeInteger(this.contractId) || this.contractId <= 0) {
      this.error.set('Identificador de contrato inválido.'); return;
    }
    this.loading.set(true); this.error.set('');
    this.api.management(this.contractId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.data.set(result);
        const finals = result.documents.filter(d => d.is_final);
        if (!finals.some(d => d.id === this.documentId)) this.documentId = finals[0]?.id ?? null;
      },
      error: err => this.error.set(err?.error?.message || err?.error?.error || 'No se pudo consultar el contrato.'),
    });
  }

  invite(): void {
    if (this.busy()) return;
    if (!this.documentId || !this.signerName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.signerEmail.trim())) {
      this.error.set('Selecciona un documento final y captura nombre y correo válidos.'); return;
    }
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.api.invite(this.contractId, {
      document_id: this.documentId, signer_role: this.signerRole,
      signer_name: this.signerName.trim(), signer_email: this.signerEmail.trim(),
    }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.message.set('Invitación enviada por correo.'); this.signerName = ''; this.signerEmail = ''; this.refresh(); },
      error: err => this.error.set(err?.error?.message || 'No se pudo enviar la invitación.'),
    });
  }

  resendReceipt(item: ContractInvitationAdmin): void {
    if (this.busy() || item.status !== 'signed' || !item.signature) return;
    if (!this.documentRef.defaultView?.confirm(`¿Reenviar el comprobante a ${item.signer_email}?`)) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.api.resendReceipt(item.id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.message.set('El servidor SMTP aceptó el comprobante para entrega.'),
      error: err => this.error.set(err?.error?.message || 'No fue posible reenviar el comprobante.'),
    });
  }

  downloadDocument(documentId: number): void {
    this.download(this.api.document(this.contractId, documentId), `contrato-${this.contractId}-documento-${documentId}.pdf`);
  }
  downloadReceipt(requestId: number): void {
    this.download(this.api.receipt(requestId), `comprobante-firma-solicitud-${requestId}.pdf`);
  }
  private download(observable: ReturnType<ContractSignatureAdminService['receipt']>, filename: string): void {
    this.error.set('');
    observable.subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = this.documentRef.createElement('a');
        anchor.href = url; anchor.download = filename;
        this.documentRef.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: err => this.error.set(err?.error?.message || 'No se pudo descargar el PDF.'),
    });
  }
  signedCount(items: ContractInvitationAdmin[]): number {
    return items.filter(item => item.status === 'signed' && !!item.signature).length;
  }
  statusLabel(status: string): string {
    return ({ pending: 'Pendiente', verified: 'Verificado', signed: 'Firmado',
      expired: 'Vencido', revoked: 'Revocado' } as Record<string, string>)[status] || status;
  }
}
