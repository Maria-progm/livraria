import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';

export interface Livro {
  key: string;
  title: string;
  authors?: { name: string }[];
  cover_id?: number;
  first_publish_year?: number;
  subject?: string[];
  edition_count?: number;
  pages?: number;
  rating?: number;
  language?: string[];
  first_sentence?: string;
}
interface Resultado {
  key: string; title: string; author_name?: string[]; cover_i?: number;
  first_publish_year?: number; subject?: string[]; edition_count?: number;
  number_of_pages_median?: number; ratings_average?: number;
  language?: string[]; first_sentence?: string[];
}
export const CATEGORIAS = [
  { id: 'fantasia', nome: 'Fantasia', consulta: 'subject:fantasy' },
  { id: 'romance', nome: 'Romance', consulta: 'subject:romance' },
  { id: 'ficcao', nome: 'Ficção científica', consulta: 'subject:"science fiction"' },
  { id: 'distopia', nome: 'Distopia', consulta: 'subject:dystopia OR subject:dystopian' },
  { id: 'terror', nome: 'Terror', consulta: 'subject:horror' },
];

@Injectable({ providedIn: 'root' })
export class LivrosService {
  private http = inject(HttpClient);
  private cache = new Map<string, Livro>();
  private campos = 'key,title,author_name,cover_i,first_publish_year,subject,edition_count,number_of_pages_median,ratings_average,language,first_sentence';

  private consultar(params: Record<string, string | number>): Observable<Livro[]> {
    return this.http.get<{ docs: Resultado[] }>('https://openlibrary.org/search.json', {
      params: { ...params, fields: this.campos },
    }).pipe(
      map(res => res.docs.map(d => ({
        key: d.key, title: d.title, authors: [{ name: d.author_name?.[0] ?? 'Autor desconhecido' }],
        cover_id: d.cover_i, first_publish_year: d.first_publish_year, subject: d.subject,
        edition_count: d.edition_count, pages: d.number_of_pages_median,
        rating: d.ratings_average, language: d.language, first_sentence: d.first_sentence?.[0],
      }))),
      tap(livros => livros.forEach(livro => this.cache.set(livro.key, livro))),
    );
  }

  porCategoria(consulta: string) {
    return this.consultar({ q: consulta, sort: 'editions', limit: 20 })
      .pipe(map(livros => livros.filter(livro => livro.cover_id).slice(0, 6)));
  }

  buscar(termo: string) {
    return this.consultar({ q: termo.trim() || 'subject:fiction', limit: 30 });
  }

  detalhes(id: string) {
    const key = '/works/' + id;
    const salvo = this.cache.get(key);
    if (salvo) return of(salvo);
    return this.consultar({ q: 'key:' + key, limit: 1 })
      .pipe(map(livros => livros.find(livro => livro.key === key) ?? null));
  }
}
