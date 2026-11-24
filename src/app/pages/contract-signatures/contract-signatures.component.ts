
import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';

import {
  ContractSignatureAdminService,
  ContractInvitationAdmin,
  SignatureManagement
} from '../../services/contract-signature-admin.service';

@Component({
  selector: 'app-contract-signatures',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contract-signatures.component.html'
})
export class ContractSignaturesComponent implements OnInit {
  private readonly api = inject(ContractSignatureAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly documentRef = inject(DOCUMENT);

  readonly contractId = Number(
    this.route.snapshot.paramMap.get('id')
  );

  readonly data = signal<SignatureManagement | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly downloadingId = signal<string | null>(null);
  readonly finalizingDocument = signal(false);
  readonly showFinalizeModal = signal(false);

  readonly error = signal('');
  readonly message = signal('');
  readonly expandedAudit = signal(false);

  readonly signerSearch = signal('');
  readonly statusFilter = signal('all');

  signerName = '';
  signerEmail = '';
  signerRole: 'client' | 'provider' = 'client';
  documentId: number | null = null;

  readonly invitationsCount = computed(
    () => this.data()?.invitations.length ?? 0
  );

  readonly signedCount = computed(
    () => this.data()?.invitations.filter(
      item => item.status === 'signed' && !!item.signature
    ).length ?? 0
  );

  readonly pendingCount = computed(
    () => this.data()?.invitations.filter(
      item =>
        item.status === 'pending' ||
        item.status === 'verified'
    ).length ?? 0
  );

  readonly documentsCount = computed(
    () => this.data()?.documents.length ?? 0
  );

  readonly finalDocuments = computed(
    () => this.data()?.documents.filter(
      document => document.is_final
    ) ?? []
  );

  readonly currentFinalDocument = computed(
    () => [...this.finalDocuments()]
      .sort((a, b) => b.version - a.version)[0] ?? null
  );

  readonly activeSignatureRequests = computed(
    () => (this.data()?.invitations ?? []).some(
      item =>
        item.status === 'pending' ||
        item.status === 'verified'
    )
  );

  readonly hasRegisteredSignatures = computed(
    () => (this.data()?.invitations ?? []).some(
      item => !!item.signature
    )
  );

  readonly canFinalizeDocument = computed(() =>
    this.data()?.contract.status === 'draft' &&
    !this.loading() &&
    !this.busy() &&
    !this.finalizingDocument() &&
    !this.activeSignatureRequests() &&
    !this.hasRegisteredSignatures()
  );

  readonly filteredInvitations = computed(() => {
    const search = this.signerSearch().trim().toLowerCase();
    const status = this.statusFilter();

    return (this.data()?.invitations ?? []).filter(item => {
      const matchesStatus =
        status === 'all' || item.status === status;

      const searchable = [
        item.id,
        item.signer_name,
        item.signer_email,
        item.signer_role,
        item.document_id
      ].join(' ').toLowerCase();

      return matchesStatus &&
        (!search || searchable.includes(search));
    });
  });

  readonly signatureProgress = computed(() => {
    const total = this.invitationsCount();
    return total === 0
      ? 0
      : Math.round((this.signedCount() / total) * 100);
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    if (
      !Number.isSafeInteger(this.contractId) ||
      this.contractId <= 0
    ) {
      this.error.set('Identificador de contrato inválido.');
      return;
    }

    if (this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    this.api.management(this.contractId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.data.set(result);

          const finals = result.documents
            .filter(document => document.is_final)
            .sort((a, b) => b.version - a.version);

          if (!finals.some(doc => doc.id === this.documentId)) {
            this.documentId = finals[0]?.id ?? null;
          }
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
        }
      });
  }

  openFinalizeModal(): void {
    if (!this.canFinalizeDocument()) return;

    this.error.set('');
    this.message.set('');
    this.showFinalizeModal.set(true);
  }

  closeFinalizeModal(): void {
    if (this.finalizingDocument()) return;
    this.showFinalizeModal.set(false);
  }

  finalizeContractDocument(): void {
    if (
      !this.showFinalizeModal() ||
      !this.canFinalizeDocument()
    ) return;

    this.finalizingDocument.set(true);
    this.error.set('');
    this.message.set('');

    this.api.finalizeDocument(this.contractId)
      .pipe(
        finalize(() => this.finalizingDocument.set(false))
      )
      .subscribe({
        next: document => {
          this.showFinalizeModal.set(false);
          this.documentId = document.id;

          this.message.set(
            `Documento final versión ${document.version} ` +
            'generado correctamente.'
          );

          this.refresh();
        },
        error: (err: HttpErrorResponse) => {
          this.showFinalizeModal.set(false);
          this.error.set(this.errorMessage(err));
        }
      });
  }

  invite(): void {
   if (!this.canInvite()) {
  this.error.set(
    'Solo puedes enviar invitaciones para contratos en borrador.'
  );
  return;
}

    const name = this.signerName.trim();
    const email = this.signerEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !this.documentId ||
      !this.finalDocuments().some(
        doc => doc.id === this.documentId
      )
    ) {
      this.error.set('Selecciona un documento final válido.');
      return;
    }

    if (!name || name.length > 200) {
      this.error.set('Captura un nombre válido.');
      return;
    }

    if (!emailRegex.test(email) || email.length > 254) {
      this.error.set('Captura un correo electrónico válido.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.message.set('');

    this.api.invite(this.contractId, {
      document_id: this.documentId,
      signer_role: this.signerRole,
      signer_name: name,
      signer_email: email
    })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.message.set(
            'La invitación fue registrada correctamente.'
          );

          this.signerName = '';
          this.signerEmail = '';
          this.refresh();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
        }
      });
  }

  resendReceipt(item: ContractInvitationAdmin): void {
    if (
      this.busy() ||
      item.status !== 'signed' ||
      !item.signature
    ) return;

    const confirmed = this.documentRef.defaultView?.confirm(
      `¿Reenviar el comprobante a ${item.signer_email}?`
    );

    if (!confirmed) return;

    this.busy.set(true);
    this.error.set('');
    this.message.set('');

    this.api.resendReceipt(item.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.message.set(
            'El servidor aceptó el comprobante para su entrega.'
          );
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
        }
      });
  }

  downloadDocument(documentId: number): void {
    this.download(
      this.api.document(this.contractId, documentId),
      `contrato-${this.contractId}-documento-${documentId}.pdf`,
      `document-${documentId}`
    );
  }

  downloadReceipt(requestId: number): void {
    this.download(
      this.api.receipt(requestId),
      `comprobante-firma-${requestId}.pdf`,
      `receipt-${requestId}`
    );
  }

  private download(
    request: Observable<Blob>,
    filename: string,
    key: string
  ): void {
    if (this.downloadingId() !== null) return;

    this.downloadingId.set(key);
    this.error.set('');

    request
      .pipe(finalize(() => this.downloadingId.set(null)))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const anchor = this.documentRef.createElement('a');

          anchor.href = url;
          anchor.download = filename;

          this.documentRef.body.appendChild(anchor);
          anchor.click();
          anchor.remove();

          this.documentRef.defaultView?.setTimeout(
            () => URL.revokeObjectURL(url),
            30000
          );
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
        }
      });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      verified: 'Verificado',
      signed: 'Firmado',
      expired: 'Vencido',
      revoked: 'Revocado'
    };

    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 ring-amber-200',
      verified: 'bg-blue-50 text-blue-700 ring-blue-200',
      signed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      expired: 'bg-red-50 text-red-700 ring-red-200',
      revoked: 'bg-slate-100 text-slate-600 ring-slate-200'
    };

    return classes[status] ??
      'bg-slate-50 text-slate-700 ring-slate-200';
  }

  roleLabel(role: string): string {
    return role === 'client' ? 'Cliente' : 'Proveedor';
  }

  clearFilters(): void {
    this.signerSearch.set('');
    this.statusFilter.set('all');
  }

  private errorMessage(err: HttpErrorResponse): string {
    const serverMessage =
      typeof err.error?.message === 'string'
        ? err.error.message
        : null;

    if (err.status === 400) {
      return serverMessage ||
        'La solicitud contiene datos inválidos.';
    }

    if (err.status === 401) {
      return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    }

    if (err.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }

    if (err.status === 404) {
      return 'No se encontró el contrato o documento solicitado.';
    }

    if (err.status === 409) {
      return serverMessage ||
        'La operación no es válida para el estado actual.';
    }

    return serverMessage ||
      'Ocurrió un error al procesar la solicitud.';
  }

  readonly canInvite = computed(() =>
  this.data()?.contract.status === 'draft' &&
  this.finalDocuments().length > 0 &&
  !this.loading() &&
  !this.busy() &&
  !this.finalizingDocument()
);
}
