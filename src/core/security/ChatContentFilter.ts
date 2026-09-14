/**
 * Client-Side Defense-in-Depth Chat Filter
 * Kullanıcı mesaj göndermeden önce anlık UI uyarısı verir.
 * Sunucu tarafında PostgreSQL trigger'ı (filter_chat_message_content) ile çift katmanlı doğrulanır.
 */

export interface ChatSecurityCheckResult {
  isSafe: boolean;
  violations: string[];
}

export class ChatContentFilter {
  private static readonly PHONE_REGEX = /(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}/;
  private static readonly IBAN_REGEX = /TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}/i;
  private static readonly URL_REGEX = /(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me)\b/i;

  public static inspect(content: string): ChatSecurityCheckResult {
    const violations: string[] = [];

    if (this.PHONE_REGEX.test(content)) {
      violations.push('Telefon numarası paylaşımı güvenlik politikası gereği yasaktır.');
    }

    if (this.IBAN_REGEX.test(content)) {
      violations.push('IBAN/Hesap numarası paylaşımı dolandırıcılık önleme kuralları gereği engellenmiştir.');
    }

    if (this.URL_REGEX.test(content)) {
      violations.push('Harici web bağlantısı paylaşamazsınız.');
    }

    return {
      isSafe: violations.length === 0,
      violations,
    };
  }
}
