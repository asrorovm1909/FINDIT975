
const $ = id => document.getElementById(id);

// Новая база без демонстрационных объявлений
const STORAGE_KEY = "findit_clean_v1";

let items = loadItems();

function loadItems() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);

        if (!data) return [];

        const parsed = JSON.parse(data);

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

function saveItems() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
    } catch (error) {
        console.error("Ошибка сохранения:", error);
        return false;
    }
}

// Защита текста от HTML-кода
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// Уведомления
let toastTimer;

function notify(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Открытие формы
function openModal(type = "lost") {
    $("itemType").value = type;
    $("modal").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    $("modal").classList.remove("active");
    document.body.style.overflow = "";
}

$("openAdd").addEventListener("click", () => openModal());
$("heroFound").addEventListener("click", () => openModal("found"));
$("catalogAdd").addEventListener("click", () => openModal());
$("emptyAdd").addEventListener("click", () => openModal());
$("bottomAdd").addEventListener("click", () => openModal("found"));
$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", event => {
    if (event.target === $("modal")) closeModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});

// Проверка контактов
function getContactLink(contact) {
    const value = contact.trim();

    if (/^@[a-zA-Z0-9_]{5,32}$/.test(value)) {
        return "https://t.me/" + value.substring(1);
    }

    if (/^\+?[0-9\s()-]{7,20}$/.test(value)) {
        return "tel:" + value.replace(/[^\d+]/g, "");
    }

    return null;
}

// Создание карточки
function createCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";

    const lost = item.type === "lost";

    const image = item.image
        ? `<img src="${item.image}" alt="Фотография вещи">`
        : "📦";

    const contact = getContactLink(item.contact);

    const contactButton = contact
        ? `<a class="contact-btn"
              href="${escapeHTML(contact)}"
              target="_blank"
              rel="noopener noreferrer">
              Связаться с человеком →
           </a>`
        : `<span class="contact-btn">Контакт недоступен</span>`;

    card.innerHTML = `
        <div class="item-image">${image}</div>

        <div class="item-info">
            <div class="badges">
                <span class="badge ${lost ? "badge-lost" : "badge-found"}">
                    ${lost ? "ПОТЕРЯНО" : "НАЙДЕНО"}
                </span>

                <span class="badge badge-category">
                    ${escapeHTML(item.category)}
                </span>
            </div>

            <h3>${escapeHTML(item.name)}</h3>

            <p>${escapeHTML(item.description)}</p>

            <div class="item-location">
                📍 ${escapeHTML(item.location)}
            </div>

            ${contactButton}
        </div>
    `;

    return card;
}

// Отображение каталога
function renderItems() {
    const search = $("searchInput").value.trim().toLowerCase();
    const type = $("typeFilter").value;
    const category = $("categoryFilter").value;

    const filtered = items.filter(item => {
        const text = (
            item.name + " " +
            item.description + " " +
            item.location
        ).toLowerCase();

        return (
            text.includes(search) &&
            (type === "all" || item.type === type) &&
            (category === "all" || item.category === category)
        );
    });

    $("cards").replaceChildren();

    filtered.forEach(item => {
        $("cards").appendChild(createCard(item));
    });

    $("totalCount").textContent = items.length;

    $("lostCount").textContent = items.filter(
        item => item.type === "lost"
    ).length;

    $("foundCount").textContent = items.filter(
        item => item.type === "found"
    ).length;

    $("resultCount").textContent =
        `Найдено объявлений: ${filtered.length}`;

    $("emptyState").hidden = filtered.length > 0;
}

// Поиск и фильтры
$("searchInput").addEventListener("input", renderItems);
$("typeFilter").addEventListener("change", renderItems);
$("categoryFilter").addEventListener("change", renderItems);

// Сжатие фотографий
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(
            new Error("Ошибка чтения файла")
        );

        reader.onload = () => {
            const image = new Image();

            image.onerror = () => reject(
                new Error("Неверный формат изображения")
            );

            image.onload = () => {
                const canvas = document.createElement("canvas");

                let width = image.width;
                let height = image.height;

                const maxSize = 1000;

                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(
                        maxSize / width,
                        maxSize / height
                    );

                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d");

                context.drawImage(image, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };

            image.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

// Публикация объявления
$("itemForm").addEventListener("submit", async event => {
    event.preventDefault();

    const name = $("itemName").value.trim();
    const location = $("itemLocation").value.trim();
    const description = $("itemDescription").value.trim();
    const contact = $("itemContact").value.trim();
    const file = $("itemImage").files[0];

    if (!name || !location || !description || !contact) {
        notify("Заполни все обязательные поля.");
        return;
    }

    if (!getContactLink(contact)) {
        notify("Проверь номер телефона или Telegram.");
        return;
    }

    if (file) {
        if (!file.type.startsWith("image/")) {
            notify("Выбери изображение.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify("Фотография должна быть меньше 5 МБ.");
            return;
        }
    }

    const button = $("itemForm").querySelector(".submit");

    button.disabled = true;
    button.textContent = "Публикуем...";

    try {
        let image = "";

        if (file) {
            image = await compressImage(file);
        }

        const newItem = {
            id: Date.now(),
            type: $("itemType").value,
            name,
            category: $("itemCategory").value,
            location,
            description,
            contact,
            image
        };

        items.unshift(newItem);

        if (!saveItems()) {
            items.shift();
            notify("Не удалось сохранить объявление. Возможно, закончилось место.");
            return;
        }

        $("itemForm").reset();

        closeModal();
        renderItems();

        $("catalog").scrollIntoView({
            behavior: "smooth"
        });

        notify("Объявление успешно опубликовано!");

    } catch (error) {
        console.error(error);
        notify("Ошибка обработки фотографии.");
    } finally {
        button.disabled = false;
        button.textContent = "Опубликовать объявление →";
    }
});

// Запуск сайта
renderItems();
