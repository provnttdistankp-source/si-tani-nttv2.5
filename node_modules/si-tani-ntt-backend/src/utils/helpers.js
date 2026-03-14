export function parseQuery(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.max(Number(query.limit || 10), 1);
  const search = String(query.search || "").trim().toLowerCase();
  const sortBy = String(query.sortBy || "id");
  const order = String(query.order || "asc").toLowerCase() === "desc" ? "desc" : "asc";

  const filters = { ...query };
  for (const key of ["page", "limit", "search", "sortBy", "order"]) {
    delete filters[key];
  }

  return { page, limit, search, sortBy, order, filters };
}

export function applySearchAndFilters(items, { search, filters }) {
  return items.filter((item) => {
    const filterMatch = Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === "") return true;
      return String(item[key] ?? "").toLowerCase() === String(value).toLowerCase();
    });

    if (!filterMatch) return false;
    if (!search) return true;

    return Object.values(item).some((val) =>
      ["string", "number"].includes(typeof val) && String(val).toLowerCase().includes(search)
    );
  });
}

export function sortItems(items, sortBy, order = "asc") {
  return [...items].sort((a, b) => {
    const left = a?.[sortBy];
    const right = b?.[sortBy];

    if (left === right) return 0;
    if (left === undefined || left === null) return 1;
    if (right === undefined || right === null) return -1;

    const result =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "id");

    return order === "desc" ? -result : result;
  });
}

export function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    pagination: {
      total,
      totalPages,
      page: currentPage,
      limit
    }
  };
}

export function monthLabel(yyyyMm) {
  return new Date(`${yyyyMm}-01`).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}
