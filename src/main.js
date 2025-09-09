/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const {discount, sale_price, quantity} = purchase; //Деструктуризация объекта
   return (sale_price * quantity * (1 - discount / 100));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const max_bonus = 0.15;
    const high_bonus = 0.1;
    const low_bonus = 0.05;
    const min_bonus = 0;

    if (index === 0)
        return seller.profit * max_bonus;
    else if (index === 1 || index === 2)
        return seller.profit * high_bonus;
    else if (index === total - 1)
        return seller.profit * min_bonus;
    else return seller.profit * low_bonus;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    // Данные не пустые или продавцы, продукты и чеки - не массивы, или переданные коллекции пустые
    if (!data 
        || !Array.isArray(data.customers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.purchase_records)
        || data.customers.length === 0
        || data.products.length === 0
        || data.sellers.length === 0
        || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;

    if (typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function") {
        throw new Error('Чего-то не хватает');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        // Заполним начальными данными
        "id": seller.id,
        "name": seller.first_name + " " + seller.last_name,
        "revenue": 0,
        "profit": 0,
        "sales_count": 0,
        "top_products": {},
        "products_sold": {},
        "bonus": 0
    }));

    const productsStats = data.products.map(product => ({
        "name": product.name,
        "category": product.category,
        "sku": product.sku,
        "purchase_price": product.purchase_price,
        "sale_price": product.sale_price
    }))

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    // Ключом будет id, значением — запись из sellerStats
    const sellerIndex = sellerStats.reduce((result, obj) => ({
        ...result,
        [obj.id]: obj
    }), {}
    )

    // Ключом будет sku, значением — запись из data.products 
    const productIndex = productsStats.reduce((result, obj) => ({
        ...result,
        [obj.sku]: obj
    }), {}
    )

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        // Увеличить количество продаж 
        seller.sales_count++;
        // Увеличить общую сумму всех продаж
        seller.revenue += record.total_amount;

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const cost = product.purchase_price * item.quantity;
            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const revenue = calculateRevenue(item, product);
            // Посчитать прибыль: выручка минус себестоимость
            const profit = revenue - cost;
            // Увеличить общую накопленную прибыль (profit) у продавца  
            seller.profit += profit;
            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            // По артикулу товара увеличить его проданное количество у продавца
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((sel1, sel2) => sel2.profit - sel1.profit);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус
        
        // Формируем топ-10 товаров
        seller.products_sold = Object.entries(seller.products_sold);
        seller.products_sold.sort((pr1, pr2) => pr2[1] - pr1[1]);
        seller.products_sold = seller.products_sold.slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id, // Строка, идентификатор продавца
        name: seller.name, // Строка, имя продавца
        revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
        profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count, // Целое число, количество продаж продавца
        top_products: seller.products_sold.map(product => ({
            sku: product[0], quantity: product[1]
        })), // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +seller.bonus.toFixed(2) // Число с двумя знаками после точки, бонус продавца
    }));
}
