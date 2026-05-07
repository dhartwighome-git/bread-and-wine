export const menu = {
    global: {
        file: [],
        edit: ["Rearrange columns", "Lock columns"],
        view: [],
        help: []
    },
    "stock-table": {
        // Add tools later
    },
    "shopping-list": {
        // Add tools later
    }
};

// Default columns (will show by default, can be hidden)
export const DEFAULT_COLUMNS = [
    // Product
    {
        key: "name",
        keyText: "Name",
        type: "text",
        order: 0,
        active: true
    },

    // Description
    {
        key: "description",
        keyText: "Description",
        type: "text",
        order: 1,
        active: false
    },

    // Product Group
    {
        key: "group",
        keyText: "Group",
        type: "select",
        order: 2,
        allowCustom: true,
        active: false
    },

    // Aisle
    {
        key: "aisle",
        keyText: "Aisle",
        type: "select",
        order: 3,
        allowCustom: true,
        active: false
    },

    // Brand
    {
        key: "brand",
        keyText: "Brand",
        type: "select",
        order: 4,
        allowCustom: true,
        active: false
    },

    // Price
    {
        key: "price",
        keyText: "Price",
        type: "number",
        order: 7,
        active: false
    },

    // is Special Offer?
    {
        key: "specialOffer",
        keyText: "Special offer?",
        type: "checkbox",
        order: 6,
        active: false
    },

    // Count (CU)
    {
        key: "countCU",
        keyText: "Count (CU)",
        type: "number",
        order: 5,
        active: true
    },

    // Contents (Slices, Pieces etc.)
    {
        key: "pieces",
        keyText: "Content (Pcs.)",
        type: "number",
        order: 8,
        active: false
    },

    // Shop
    {
        key: "shop",
        keyText: "Shop",
        type: "select",
        order: 9,
        allowCustom: true,
        active: false
    },

    // Make plan using...
    {
        key: "shoppingPlanSource",
        keyText: "Shopping plan from...",
        type: "select",
        order: 10,
        allowCustom: false,
        active: false,
        options: ["Name", "Group"]
    },

    // Min count (CU)
    {
        key: "minCountCU",
        keyText: "Min Count (CU)",
        type: "number",
        order: 11,
        active: false
    },

    // Max Count (CU)
    {
        key: "maxCountCU",
        keyText: "Max Count (CU)",
        type: "number",
        order: 12,
        active: false
    },

    // Best before
    {
        key: "bestBefore",
        keyText: "Best before",
        type: "date",
        order: 13,
        active: false
    },

    // Variety
    {
        key: "variety",
        keyText: "Variety",
        type: "text",
        order: 14,
        active: false
    }
]

export const DEFAULT_SHOPPING_COLUMNS = [
    // Product Group
    {
        key: "group",
        keyText: "Group",
        type: "select",
        order: 0,
        allowCustom: true,
        active: true
    },
    // Product
    {
        key: "name",
        keyText: "Name",
        type: "text",
        order: 1,
        active: true
    },
    // Count (CU)
    {
        key: "countCU",
        keyText: "Count (CU)",
        type: "number",
        order: 2,
        active: true
    },
    // Predicted Count (CU)
    {
        key: "predictedCU",
        keyText: "Predicted Count (CU)",
        type: "number",
        order: 3,
        active: true,
        isFixedCol: true
    },
]