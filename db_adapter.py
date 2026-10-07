#!/usr/bin/env python3
"""
VIV Fitness - Универсальный адаптер баз данных SQLite / SQL.
Автоматически находит базы данных в папке data/, определяет структуру,
сопоставляет русские и английские названия колонок и собирает catalog.json.
"""

import os
import glob
import json
import sqlite3
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CATALOG_PATH = os.path.join(DATA_DIR, 'catalog.json')

# Словарь синонимов для гибкого сопоставления колонок (в нижнем регистре без спецсимволов)
COLUMN_ALIASES = {
    'id': [
        'id', 'uuid', 'exercise_id', 'ex_id', 'code', 'slug', 'ид', 'код',
        'номер', 'фото', 'photo', 'image', 'img'
    ],
    'name': [
        'name', 'title', 'exercise_name', 'exercise', 'ex_name', 'название',
        'упражнение', 'имя', 'наименование', 'title_ru', 'name_ru'
    ],
    'category': [
        'category', 'category_name', 'type', 'body_part', 'target',
        'group_name', 'категория', 'тип', 'направление', 'группа'
    ],
    'primaryMuscles': [
        'primarymuscles', 'primary_muscles', 'primary_muscle', 'muscle',
        'muscles', 'target_muscle', 'target_muscles', 'muscle_group',
        'мышцы', 'мышца', 'целевая_мышца', 'основные_мышцы', 'группа_мышц'
    ],
    'equipment': [
        'equipment', 'equipment_name', 'gear', 'tool', 'снаряд',
        'оборудование', 'инвентарь'
    ],
    'level': [
        'level', 'difficulty', 'difficulty_level', 'experience', 'уровень',
        'сложность'
    ],
    'force': [
        'force', 'force_type', 'effort', 'усилие', 'тип_усилия'
    ],
    'mechanic': [
        'mechanic', 'mechanics', 'mechanic_type', 'механика'
    ]
}

def clean_key(s):
    """Очистка строки для сравнения: нижний регистр, только буквы и цифры"""
    if not s:
        return ''
    return re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', str(s).lower())

def slugify(text):
    """Генерация безопасного ID / префикса фото для упражнения"""
    if not text:
        return 'exercise'
    s = str(text).strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[-\s]+', '_', s)
    return s

def map_columns(table_columns):
    """Сопоставление колонок таблицы с полями приложения"""
    mapping = {}
    normalized_cols = {clean_key(c): c for c in table_columns}

    for field, aliases in COLUMN_ALIASES.items():
        found = None
        for alias in aliases:
            norm_alias = clean_key(alias)
            if norm_alias in normalized_cols:
                found = normalized_cols[norm_alias]
                break
        if found:
            mapping[field] = found

    return mapping

def load_from_sqlite_connection(conn, source_name="DB"):
    """Извлечение упражнений из соединения SQLite"""
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in cur.fetchall()]

    if not tables:
        print(f"[db_adapter] В базе {source_name} нет таблиц")
        return None

    best_table = None
    best_mapping = {}
    best_score = -1

    # Поиск таблицы с максимальным совпадением полей упражнений
    for t in tables:
        # Пропускаем служебные таблицы сессий и профиля, если это мульти-табличная база
        if t in ['workout_records', 'workout_record_sets', 'profile', 'routines', 'routine_exercises']:
            continue

        cur.execute(f"PRAGMA table_info({t});")
        cols = [c[1] for c in cur.fetchall()]
        mapping = map_columns(cols)

        score = 0
        if 'name' in mapping:
            score += 10
        if 'category' in mapping:
            score += 5
        if 'primaryMuscles' in mapping:
            score += 5
        if 'equipment' in mapping:
            score += 2
        if 'level' in mapping:
            score += 2

        if score > best_score:
            best_score = score
            best_table = t
            best_mapping = mapping

    if not best_table or 'name' not in best_mapping:
        # Если явная таблица упражнений не найдена, берём первую с наибольшим числом записей
        for t in tables:
            cur.execute(f"PRAGMA table_info({t});")
            cols = [c[1] for c in cur.fetchall()]
            mapping = map_columns(cols)
            if 'name' in mapping:
                best_table = t
                best_mapping = mapping
                break

    if not best_table or 'name' not in best_mapping:
        print(f"[db_adapter] Не удалось найти таблицу с упражнениями в {source_name}")
        return None

    print(f"[db_adapter] Выбрана таблица '{best_table}' в {source_name}")
    print(f"[db_adapter] Сопоставление колонок: {best_mapping}")

    cur.execute(f"SELECT * FROM {best_table};")
    rows = cur.fetchall()
    col_names = [d[0] for d in cur.description]

    exercises = []
    categories_set = set()

    for row in rows:
        row_dict = dict(zip(col_names, row))

        name_val = str(row_dict.get(best_mapping.get('name'), '')).strip()
        if not name_val:
            continue

        id_col = best_mapping.get('id')
        id_val = str(row_dict.get(id_col, '')).strip() if id_col else ''
        if not id_val:
            id_val = slugify(name_val)

        cat_col = best_mapping.get('category')
        cat_val = str(row_dict.get(cat_col, 'Общее')).strip() or 'Общее'
        categories_set.add(cat_val)

        muscle_col = best_mapping.get('primaryMuscles')
        muscle_val = str(row_dict.get(muscle_col, 'Все мышцы')).strip() or 'Все мышцы'

        eq_col = best_mapping.get('equipment')
        eq_val = str(row_dict.get(eq_col, 'Без снаряда')).strip() or 'Без снаряда'

        lvl_col = best_mapping.get('level')
        lvl_val = str(row_dict.get(lvl_col, 'Начинающий')).strip() or 'Начинающий'

        force_col = best_mapping.get('force')
        force_val = str(row_dict.get(force_col, '—')).strip() or '—'

        mech_col = best_mapping.get('mechanic')
        mech_val = str(row_dict.get(mech_col, '—')).strip() or '—'

        exercises.append({
            'id': id_val,
            'name': name_val,
            'category': cat_val,
            'primaryMuscles': muscle_val,
            'equipment': eq_val,
            'level': lvl_val,
            'force': force_val,
            'mechanic': mech_val
        })

    categories_list = sorted(list(categories_set))
    return {
        'categories': categories_list,
        'exercises': exercises,
        'source': source_name,
        'table': best_table,
        'total': len(exercises)
    }

def process_file(filepath):
    """Обработка одного файла: .sqlite, .db или .sql"""
    ext = os.path.splitext(filepath)[1].lower()

    if ext in ['.sqlite', '.sqlite3', '.db']:
        try:
            conn = sqlite3.connect(filepath)
            data = load_from_sqlite_connection(conn, os.path.basename(filepath))
            conn.close()
            return data
        except Exception as e:
            print(f"[db_adapter] Ошибка чтения SQLite файла {filepath}: {e}")
            return None

    elif ext == '.sql':
        try:
            # Импорт текстового SQL-дампа во временную базу в памяти
            conn = sqlite3.connect(':memory:')
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                sql_script = f.read()
            conn.executescript(sql_script)
            data = load_from_sqlite_connection(conn, os.path.basename(filepath))
            conn.close()
            return data
        except Exception as e:
            print(f"[db_adapter] Ошибка исполнения SQL скрипта {filepath}: {e}")
            return None

    return None

def find_candidate_databases():
    """Поиск всех возможных файлов баз данных в папке data/ и корне"""
    patterns = [
        os.path.join(DATA_DIR, '*.sqlite*'),
        os.path.join(DATA_DIR, '*.db*'),
        os.path.join(DATA_DIR, '*.sql'),
        os.path.join(BASE_DIR, '*.sqlite*'),
        os.path.join(BASE_DIR, '*.db*'),
        os.path.join(BASE_DIR, '*.sql'),
    ]

    files = []
    for pat in patterns:
        for f in glob.glob(pat):
            fname = os.path.basename(f)
            # Пропускаем служебные базы профиля, тренировок и статистики
            if fname in ['work.sqlite', 'stats.sqlite', 'profile.sqlite']:
                continue
            if f not in files and os.path.isfile(f):
                files.append(f)

    # Приоритет отдаем файлам, в имени которых есть 'exercise', 'home' или 'catalog'
    def sort_key(p):
        name = os.path.basename(p).lower()
        if 'home' in name or 'exercise' in name or 'catalog' in name:
            return (0, -os.path.getmtime(p))
        return (1, -os.path.getmtime(p))

    files.sort(key=sort_key)
    return files

def get_latest_db_mtime():
    """Возвращает максимальное время модификации среди всех файлов БД"""
    files = find_candidate_databases()
    if not files:
        return 0
    return max(os.path.getmtime(f) for f in files)

def adapt_database(force=False):
    """
    Основная точка входа: находит ВСЕ базы данных в data/ и корне,
    объединяет упражнения из всех баз в единый каталог без дубликатов,
    нормализует категории и сохраняет в catalog.json.
    """
    db_files = find_candidate_databases()
    if not db_files:
        print("[db_adapter] Файлы баз данных (.sqlite, .db, .sql) не найдены")
        return False

    merged_exercises = {}
    merged_categories = set()
    loaded_sources = []

    for db_path in db_files:
        fname = os.path.basename(db_path)
        print(f"[db_adapter] Анализ базы: {fname}...")
        result = process_file(db_path)
        if result and result.get('exercises'):
            loaded_sources.append(fname)
            print(f"  + Загружено {len(result['exercises'])} упражнений из '{fname}'")

            for ex in result['exercises']:
                key = clean_key(ex['name'])
                if not key:
                    continue

                if key in merged_exercises:
                    existing = merged_exercises[key]
                    for field in ['force', 'mechanic', 'equipment', 'level', 'primaryMuscles', 'category']:
                        if (not existing.get(field) or existing.get(field) == '—') and ex.get(field) and ex.get(field) != '—':
                            existing[field] = ex[field]
                else:
                    merged_exercises[key] = ex

            for cat in result.get('categories', []):
                if cat and cat.strip():
                    merged_categories.add(cat.strip())

    if not merged_exercises:
        print("[db_adapter] Ни одна база не содержала упражнений")
        return False

    categories_list = sorted(list(merged_categories), key=lambda c: c.lower())
    exercises_list = list(merged_exercises.values())
    exercises_list.sort(key=lambda e: (e.get('category', '').lower(), e.get('name', '').lower()))

    catalog_data = {
        'categories': categories_list,
        'exercises': exercises_list,
        'sources': loaded_sources,
        'total': len(exercises_list)
    }

    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog_data, f, ensure_ascii=False, indent=2)

    print(f"✅ [db_adapter] Успешно объединено {len(loaded_sources)} баз: {', '.join(loaded_sources)}")
    print(f"   Всего уникальных упражнений: {len(exercises_list)}")
    print(f"   Категорий: {len(categories_list)} ({', '.join(categories_list[:6])}...)")
    print(f"   Файл сохранен: {CATALOG_PATH}")
    return True

def check_and_sync():
    """
    Проверяет, изменился ли какой-либо файл базы данных.
    Если да или catalog.json отсутствует — обновляет автоматически.
    """
    if not os.path.exists(CATALOG_PATH):
        print("[db_adapter] catalog.json отсутствует, запуск адаптера...")
        return adapt_database(force=True)

    catalog_mtime = os.path.getmtime(CATALOG_PATH)
    latest_db_mtime = get_latest_db_mtime()

    if latest_db_mtime > catalog_mtime:
        print("[db_adapter] Обнаружен обновленный файл базы данных, синхронизация...")
        return adapt_database(force=True)

    return False

if __name__ == '__main__':
    print("=== Запуск VIV Database Auto-Adapter ===")
    adapt_database(force=True)
