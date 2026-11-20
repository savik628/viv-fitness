// =============================================================================
// VIV Fitness - Каталог упражнений (Exercise Catalog Database)
// =============================================================================
// Содержит 100 самых популярных и эффективных упражнений по 8 мышечным группам
// и направлениям тренировок с указанием типа нагрузки и оборудования.
// =============================================================================

(function () {
  'use strict';

  const EXERCISE_CATEGORIES = [
    { id: 'all', label: 'Все' },
    { id: 'chest', label: 'Грудь' },
    { id: 'back', label: 'Спина' },
    { id: 'shoulders', label: 'Плечи' },
    { id: 'legs', label: 'Ноги' },
    { id: 'arms', label: 'Руки' },
    { id: 'core', label: 'Кор' },
    { id: 'cardio', label: 'Кардио' },
    { id: 'mobility', label: 'Растяжка' }
  ];

  const EXERCISE_CATALOG = [
    // -------------------------------------------------------------------------
    // ГРУДЬ (Chest) - 15 упражнений
    // -------------------------------------------------------------------------
    { name: 'Жим лежа со штангой', category: 'chest', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Жим гантелей на горизонтальной скамье', category: 'chest', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Жим штанги на наклонной скамье', category: 'chest', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Жим гантелей на наклонной скамье', category: 'chest', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Жим штанги на скамье головой вниз', category: 'chest', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Разводка гантелей лежа', category: 'chest', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Разводка гантелей на наклонной скамье', category: 'chest', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Сведение рук в кроссовере', category: 'chest', type: 'weight_reps', equipment: 'cable' },
    { name: 'Сведение рук в тренажере Бабочка (Pec Deck)', category: 'chest', type: 'weight_reps', equipment: 'machine' },
    { name: 'Жим в тренажере Хаммер на грудь', category: 'chest', type: 'weight_reps', equipment: 'machine' },
    { name: 'Жим в тренажере Смита на наклонной скамье', category: 'chest', type: 'weight_reps', equipment: 'machine' },
    { name: 'Отжимания от пола', category: 'chest', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Отжимания на брусьях (акцент на грудь)', category: 'chest', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Пуловер с гантелью лежа', category: 'chest', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Сведение рук на нижнем блоке', category: 'chest', type: 'weight_reps', equipment: 'cable' },

    // -------------------------------------------------------------------------
    // СПИНА (Back) - 15 упражнений
    // -------------------------------------------------------------------------
    { name: 'Подтягивания прямым хватом', category: 'back', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Подтягивания обратным хватом', category: 'back', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Подтягивания параллельным хватом', category: 'back', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Тяга штанги в наклоне', category: 'back', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Становая тяга со штангой', category: 'back', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Тяга верхнего блока к груди широким хватом', category: 'back', type: 'weight_reps', equipment: 'cable' },
    { name: 'Тяга верхнего блока обратным хватом', category: 'back', type: 'weight_reps', equipment: 'cable' },
    { name: 'Тяга горизонтального блока к поясу', category: 'back', type: 'weight_reps', equipment: 'cable' },
    { name: 'Тяга гантели одной рукой в наклоне', category: 'back', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Тяга Т-грифа с упором в грудь', category: 'back', type: 'weight_reps', equipment: 'machine' },
    { name: 'Шраги со штангой стоя', category: 'back', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Шраги с гантелями стоя', category: 'back', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Гиперэкстензия', category: 'back', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Пуловер на блоке с канатом стоя', category: 'back', type: 'weight_reps', equipment: 'cable' },
    { name: 'Становая тяга сумо', category: 'back', type: 'weight_reps', equipment: 'barbell' },

    // -------------------------------------------------------------------------
    // ПЛЕЧИ (Shoulders) - 12 упражнений
    // -------------------------------------------------------------------------
    { name: 'Армейский жим штанги стоя', category: 'shoulders', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Жим гантелей сидя', category: 'shoulders', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Жим Арнольда с гантелями', category: 'shoulders', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Жим штанги из-за головы сидя', category: 'shoulders', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Махи гантелями в стороны стоя', category: 'shoulders', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Махи гантелями в наклоне на заднюю дельту', category: 'shoulders', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Подъем гантелей перед собой', category: 'shoulders', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Тяга штанги к подбородку широким хватом', category: 'shoulders', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Разведение рук в тренажере на заднюю дельту', category: 'shoulders', type: 'weight_reps', equipment: 'machine' },
    { name: 'Махи в кроссовере в стороны на среднюю дельту', category: 'shoulders', type: 'weight_reps', equipment: 'cable' },
    { name: 'Жим в тренажере на плечи', category: 'shoulders', type: 'weight_reps', equipment: 'machine' },
    { name: 'Face Pull (Тяга каната к лицу в кроссовере)', category: 'shoulders', type: 'weight_reps', equipment: 'cable' },

    // -------------------------------------------------------------------------
    // НОГИ (Legs) - 18 упражнений
    // -------------------------------------------------------------------------
    { name: 'Приседания со штангой на спине', category: 'legs', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Фронтальные приседания со штангой', category: 'legs', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Жим ногами в тренажере', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Гакк-приседания в тренажере', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Румынская тяга со штангой', category: 'legs', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Румынская тяга с гантелями', category: 'legs', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Выпады с гантелями в шаге', category: 'legs', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Болгарские сплит-приседания с гантелями', category: 'legs', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Разгибания ног в тренажере сидя', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Сгибания ног в тренажере лежа', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Сгибания ног в тренажере сидя', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Ягодичный мостик со штангой', category: 'legs', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Сведение ног в тренажере', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Разведение ног в тренажере', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Кубковые приседания с гантелью (Goblet Squat)', category: 'legs', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Подъемы на носки стоя в тренажере', category: 'legs', type: 'weight_reps', equipment: 'machine' },
    { name: 'Подъемы на носки сидя со штангой', category: 'legs', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Подъемы на носки на одной ноге', category: 'legs', type: 'bodyweight', equipment: 'bodyweight' },

    // -------------------------------------------------------------------------
    // РУКИ (Arms: Biceps & Triceps) - 18 упражнений
    // -------------------------------------------------------------------------
    { name: 'Подъем штанги на бицепс стоя', category: 'arms', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Подъем гантелей на бицепс с супинацией', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Сгибания на скамье Скотта с EZ-грифом', category: 'arms', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Молотковые сгибания с гантелями (Молоты)', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Концентрированные сгибания с гантелью', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Сгибания на бицепс в кроссовере на нижнем блоке', category: 'arms', type: 'weight_reps', equipment: 'cable' },
    { name: 'Сгибания на бицепс на наклонной скамье', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Сгибания рук в тренажере на бицепс', category: 'arms', type: 'weight_reps', equipment: 'machine' },
    { name: 'Жим лежа узким хватом', category: 'arms', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Французский жим лежа со штангой', category: 'arms', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Французский жим с гантелями лежа', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Разгибания на трицепс на верхнем блоке с канатом', category: 'arms', type: 'weight_reps', equipment: 'cable' },
    { name: 'Разгибания на трицепс на верхнем блоке с прямой рукоятью', category: 'arms', type: 'weight_reps', equipment: 'cable' },
    { name: 'Разгибания руки из-за головы с гантелью', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Отжимания на брусьях на трицепс', category: 'arms', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Отжимания от скамьи на трицепс', category: 'arms', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Разгибания рук в наклоне (Kickback)', category: 'arms', type: 'weight_reps', equipment: 'dumbbells' },
    { name: 'Сгибания запястий со штангой на предплечья', category: 'arms', type: 'weight_reps', equipment: 'barbell' },

    // -------------------------------------------------------------------------
    // КОР И ПРЕСС (Core) - 10 упражнений
    // -------------------------------------------------------------------------
    { name: 'Скручивания на полу', category: 'core', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Подъемы ног в висе на перекладине', category: 'core', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Подъемы ног в упоре на брусьях', category: 'core', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Планка классическая на локтях', category: 'core', type: 'duration', equipment: 'bodyweight' },
    { name: 'Боковая планка', category: 'core', type: 'duration', equipment: 'bodyweight' },
    { name: 'Колесо для пресса (ролик)', category: 'core', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Скручивания на римском стуле с наклоном', category: 'core', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Скручивания на верхнем блоке на коленях (Молитва)', category: 'core', type: 'weight_reps', equipment: 'cable' },
    { name: 'Русские скручивания с диском', category: 'core', type: 'weight_reps', equipment: 'barbell' },
    { name: 'Вакуум живота', category: 'core', type: 'duration', equipment: 'bodyweight' },

    // -------------------------------------------------------------------------
    // КАРДИО И ВЫНОСЛИВОСТЬ (Cardio) - 8 упражнений
    // -------------------------------------------------------------------------
    { name: 'Бег на беговой дорожке', category: 'cardio', type: 'distance', equipment: 'cardio' },
    { name: 'Бег на улице', category: 'cardio', type: 'distance', equipment: 'cardio' },
    { name: 'Велотренажер', category: 'cardio', type: 'distance', equipment: 'cardio' },
    { name: 'Гребной тренажер', category: 'cardio', type: 'distance', equipment: 'cardio' },
    { name: 'Эллиптический тренажер', category: 'cardio', type: 'duration', equipment: 'cardio' },
    { name: 'Прыжки на скакалке', category: 'cardio', type: 'duration', equipment: 'cardio' },
    { name: 'Берпи', category: 'cardio', type: 'bodyweight', equipment: 'bodyweight' },
    { name: 'Степпер (Лестница)', category: 'cardio', type: 'duration', equipment: 'cardio' },

    // -------------------------------------------------------------------------
    // РАСТЯЖКА И МОБИЛЬНОСТЬ (Mobility) - 4 упражнения
    // -------------------------------------------------------------------------
    { name: 'Растяжка грудных мышц у стены', category: 'mobility', type: 'duration', equipment: 'bodyweight' },
    { name: 'Растяжка задней поверхности бедра сидя', category: 'mobility', type: 'duration', equipment: 'bodyweight' },
    { name: 'Растяжка плечевого пояса и дельт', category: 'mobility', type: 'duration', equipment: 'bodyweight' },
    { name: 'МФР / Фоам-роллер на всё тело', category: 'mobility', type: 'duration', equipment: 'bodyweight' }
  ];

  function getCategoryLabel(catId) {
    const item = EXERCISE_CATEGORIES.find(c => c.id === catId);
    return item ? item.label : 'Другое';
  }

  function getExerciseMeta(exerciseName) {
    if (!exerciseName) return null;
    const clean = exerciseName.trim().toLowerCase();
    const found = EXERCISE_CATALOG.find(e => e.name.trim().toLowerCase() === clean);
    if (found) return found;
    return {
      name: exerciseName.trim(),
      category: 'other',
      type: 'weight_reps',
      equipment: 'other'
    };
  }

  window.EXERCISE_CATEGORIES = EXERCISE_CATEGORIES;
  window.EXERCISE_CATALOG = EXERCISE_CATALOG;
  window.getCategoryLabel = getCategoryLabel;
  window.getExerciseMeta = getExerciseMeta;
})();
