
const STORAGE_KEY = "findit_clean_v1";

let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const form = document.getElementById("listingForm");
const list = document.getElementById("listings");
const search = document.getElementById("searchInput");
const category = document.getElementById("categoryFilter");

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function renderItems() {
  if (!list) return;

  const query = (search?.value || "").toLowerCase();
  const selectedCategory = category?.value || "all";

  const filtered = items.filter(item => {
    const matchesSearch =
      (item.title || "").toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === "all" ||
      item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Объявлений пока нет</h3>
        <p>Попробуйте изменить поиск или добавьте объявление.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(item => `
    <article class="listing-card">
      ${item.image ? `
        <img
          class="listing-image"
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.title)}"
        >
      ` : ""}

      <div class="listing-content">
        <span class="listing-category">
          ${escapeHTML(item.category || "Другое")}
        </span>

        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>

        <p class="listing-location">
          📍 ${escapeHTML(item.location || "Не указано")}
        </p>

        <p>📞 ${escapeHTML(item.contact || "Не указан")}</p>

        <small>${escapeHTML(item.date || "")}</small>

        <button
          class="delete-button"
          data-delete-id="${escapeHTML(item.id)}"
          type="button"
        >
          🗑️ Удалить объявление
        </button>
      </div>
    </article>
  `).join("");
}

// Удаление объявления
if (list) {
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    const id = button.dataset.deleteId;

    const confirmed = confirm(
      "Вы действительно хотите удалить это объявление?"
    );

    if (!confirmed) return;

    items = items.filter(item => String(item.id) !== String(id));

    saveItems();
    renderItems();
  });
}

// Добавление объявления
if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();

    const title = form.querySelector('[name="title"]')?.value.trim();
    const description = form.querySelector('[name="description"]')?.value.trim();
    const categoryValue = form.querySelector('[name="category"]')?.value;
    const location = form.querySelector('[name="location"]')?.value.trim();
    const contact = form.querySelector('[name="contact"]')?.value.trim();
    const imageInput = form.querySelector('[name="image"]');

    if (!title || !description) {
      alert("Заполните название и описание.");
      return;
    }

    const file = imageInput?.files?.[0];

    const addItem = image => {
      const newItem = {
        id: Date.now().toString(),
        title,
        description,
        category: categoryValue || "Другое",
        location: location || "",
        contact: contact || "",
        image: image || "",
        date: new Date().toLocaleDateString("ru-RU")
      };

      items.unshift(newItem);
      saveItems();
      form.reset();
      renderItems();
      alert("Объявление добавлено!");
    };

    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Выберите изображение.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert("Фото должно быть меньше 2 МБ.");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => addItem(reader.result);
      reader.onerror = () => alert("Не удалось загрузить фото.");
      reader.readAsDataURL(file);
    } else {
      addItem("");
    }
  });
}

search?.addEventListener("input", renderItems);
category?.addEventListener("change", renderItems);

renderItems();
