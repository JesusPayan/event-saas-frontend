import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CompanyReceiptSettings, CompanyReceiptSettingsService } from '../../services/company-receipt-settings.service';

@Component({
  selector: 'app-company-receipt-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-receipt-settings.component.html'
})
export class CompanyReceiptSettingsComponent implements OnInit, OnDestroy {
  private readonly api = inject(CompanyReceiptSettingsService);
  readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly logoUrl = signal<string | null>(null);
  readonly canEdit = this.auth.hasPermission('contracts.update');
  model: CompanyReceiptSettings = {
    commercial_name: null, contact_email: null, phone: null, address: null,
    tax_id: null, timezone: 'America/Mazatlan', has_logo: false, tenant_name: ''
  };
  readonly zones = ['America/Mazatlan','America/Mexico_City','America/Tijuana','America/Hermosillo','America/Cancun','UTC'];

  ngOnInit(): void {
    this.api.get().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: data => { this.model = data; if (data.has_logo) this.loadLogo(); },
      error: e => this.fail(e)
    });
  }
  ngOnDestroy(): void { const url=this.logoUrl(); if(url) URL.revokeObjectURL(url); }
  private fail(e: unknown): void {
    const err=e as HttpErrorResponse;
    this.error.set(err.error?.message || err.error?.error || 'No fue posible completar la operación.');
  }
  loadLogo(): void {
    this.api.logo().subscribe({ next: blob => {
      const old=this.logoUrl(); if(old) URL.revokeObjectURL(old);
      this.logoUrl.set(URL.createObjectURL(blob));
    }, error: e => this.fail(e) });
  }
  save(): void {
    if (!this.canEdit || this.busy()) return;
    this.busy.set(true);this.error.set('');this.success.set('');
    const { commercial_name,contact_email,phone,address,tax_id,timezone }=this.model;
    this.api.update({commercial_name:commercial_name ?? '',contact_email:contact_email ?? '',phone:phone ?? '',address:address ?? '',tax_id:tax_id ?? '',timezone})
      .pipe(finalize(() => this.busy.set(false))).subscribe({
        next: data => {this.model=data;this.success.set('Configuración guardada. Los comprobantes ya emitidos no cambian.');},
        error: e => this.fail(e)
      });
  }
  upload(event: Event): void {
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];input.value='';
    if(!file || !this.canEdit || this.busy()) return;
    if(!['image/png','image/jpeg'].includes(file.type) || file.size>1024*1024){this.error.set('Selecciona PNG o JPG de hasta 1 MB.');return;}
    this.busy.set(true);this.error.set('');this.success.set('');
    this.api.uploadLogo(file).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.model.has_logo=true;this.loadLogo();this.success.set('Logotipo actualizado.');},
      error:e=>this.fail(e)
    });
  }
  removeLogo(): void {
    if(!this.canEdit || this.busy()) return;
    this.busy.set(true);this.error.set('');
    this.api.removeLogo().pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.model.has_logo=false;const old=this.logoUrl();if(old) URL.revokeObjectURL(old);this.logoUrl.set(null);this.success.set('Logotipo eliminado.');},
      error:e=>this.fail(e)
    });
  }
}
