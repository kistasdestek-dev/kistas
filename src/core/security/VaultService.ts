import { supabase } from '../supabase/supabaseClient';

export type VaultRecordType = 'iban' | 'tckn' | 'tax_id' | 'passport';

export interface VaultRecordMetadata {
  bank_name?: string;
  account_holder?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface UserVaultRecord {
  id: string;
  user_id: string;
  record_type: VaultRecordType;
  masked_preview: string;
  metadata: VaultRecordMetadata;
  created_at: string;
  updated_at: string;
}

export interface StoreVaultRecordResult {
  success: boolean;
  record_id: string;
  record_type: VaultRecordType;
  masked_preview: string;
}

export interface RevealVaultRecordResult {
  success: boolean;
  record_id: string;
  record_type: VaultRecordType;
  decrypted_value: string;
  metadata: VaultRecordMetadata;
}

/**
 * SecOps Standard: B1 Banka Düzeyinde Saha İçi Şifreleme (FLE Vault Service)
 * - İstemci hiçbir zaman şifreleme anahtarına veya ciphertext'e doğrudan dokunmaz.
 * - Sunucu tarafında pgcrypto AES-256 OpenPGP standardıyla şifreleme yapılır.
 * - Hassas veriler UI'a her zaman maskelenmiş (masked_preview) olarak döner.
 */
export const VaultService = {
  /**
   * Hassas kimlik veya finansal veriyi sunucu kasasına güvenle kaydeder.
   */
  storeRecord: async (
    recordType: VaultRecordType,
    plainText: string,
    metadata: VaultRecordMetadata = {}
  ): Promise<StoreVaultRecordResult> => {
    const cleanText = plainText.trim();
    if (!cleanText || cleanText.length < 3) {
      throw new Error('Geçersiz veri uzunluğu.');
    }

    const { data, error } = await supabase.rpc('store_vault_record', {
      p_type: recordType,
      p_plaintext: cleanText,
      p_metadata: metadata,
    });

    if (error) {
      throw new Error(error.message || 'Kasa kaydı oluşturulamadı.');
    }

    return data as StoreVaultRecordResult;
  },

  /**
   * Oturum sahibinin kayıtlı kasa verilerini maskeli olarak listeler (ham şifreli baytlar istemciye verilmez).
   */
  getMyRecords: async (): Promise<UserVaultRecord[]> => {
    const { data, error } = await supabase
      .from('user_vault_records')
      .select('id, user_id, record_type, masked_preview, metadata, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Kasa kayıtları yüklenemedi.');
    }

    return (data || []) as UserVaultRecord[];
  },

  /**
   * Yalnızca hak sahibi kullanıcı veya yetkili finansal işlem anında veriyi deşifre eder.
   * Bu işlem sunucu tarafında financial_audit günlüğüne kriptografik iz bırakır.
   */
  revealRecord: async (recordId: string): Promise<RevealVaultRecordResult> => {
    if (!recordId) {
      throw new Error('Kayıt ID belirtilmedi.');
    }

    const { data, error } = await supabase.rpc('reveal_vault_record', {
      p_record_id: recordId,
    });

    if (error) {
      throw new Error(error.message || 'Kayıt deşifre edilemedi.');
    }

    return data as RevealVaultRecordResult;
  },

  /**
   * Kasa kaydını güvenli bir şekilde siler.
   */
  deleteRecord: async (recordId: string): Promise<boolean> => {
    if (!recordId) {
      throw new Error('Kayıt ID belirtilmedi.');
    }

    const { data, error } = await supabase.rpc('delete_vault_record', {
      p_record_id: recordId,
    });

    if (error) {
      throw new Error(error.message || 'Kayıt silinemedi.');
    }

    return Boolean(data?.success);
  },
};
