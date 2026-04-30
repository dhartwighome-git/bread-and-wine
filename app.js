/* Initialise Firestore database */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// const auth = getAuth();

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA73guwI5BCtkvaqLUgBkQKc9zF209fNR0",
    authDomain: "bread-and-wine.firebaseapp.com",
    projectId: "bread-and-wine",
    storageBucket: "bread-and-wine.firebasestorage.app",
    messagingSenderId: "754486129562",
    appId: "1:754486129562:web:1194bd45b506597857c023"
};

// Default menu bar
const menu = {
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
const DEFAULT_COLUMNS = [
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
        active: true
    },

    // Product Group
    {
        key: "group",
        keyText: "Group",
        type: "select",
        order: 2,
        allowCustom: true,
        active: true
    },

    // Aisle
    {
        key: "aisle",
        keyText: "Aisle",
        type: "select",
        order: 3,
        allowCustom: true,
        active: true
    },

    // Brand
    {
        key: "brand",
        keyText: "Brand",
        type: "select",
        order: 4,
        allowCustom: true,
        active: true
    },

    // Price
    {
        key: "price",
        keyText: "Price",
        type: "number",
        order: 7,
        active: true
    },

    // is Special Offer?
    {
        key: "specialOffer",
        keyText: "Special offer?",
        type: "checkbox",
        order: 6,
        active: true
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
        active: true
    },

    // Shop
    {
        key: "shop",
        keyText: "Shop",
        type: "select",
        order: 9,
        allowCustom: true,
        active: true
    },

    // Make plan using...
    {
        key: "shoppingPlanSource",
        keyText: "Shopping plan from...",
        type: "select",
        order: 10,
        allowCustom: false,
        active: true,
        options: ["Name", "Group"]
    },

    // Min count (CU)
    {
        key: "minCountCU",
        keyText: "Min Count (CU)",
        type: "number",
        order: 11,
        active: true
    },

    // Max Count (CU)
    {
        key: "maxCountCU",
        keyText: "Max Count (CU)",
        type: "number",
        order: 12,
        active: true
    },

    // Best before
    {
        key: "bestBefore",
        keyText: "Best before",
        type: "date",
        order: 13,
        active: true
    },
]

const DEFAULT_SHOPPING_COLUMNS = [
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

// Constants
var showCols = "active";
const maxLog = 100;

// Variables
let activeMenu = null;
let currentView = "inventory";
let localProducts = []; // local copy of Firestore products collection
let currentColumns = [];
let isRearranging = false;
let isDragging = false;
let draggedKey = null;

// for table filtering and sorting
const tableState = {
    filters: {},
    sorting: null,
    search: ""
}

// Current view settings
const viewSettings = [
    {
        viewType: "shopping-list-table",
        keepDefaultOrder: true,
        columnVisibilityEditable: false,
    }
]

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let userId = null;

// Helper functions
// Concatenate column names to use as key (helper)
function toCamelCase(str) {
    return str
        .replace(/[^a-zA-Z0-9 ]+/g, '')      // remove non-alphanumeric
        .replace(/\s+(.)/g, (_, chr) => chr.toUpperCase()) // capitalize letters after spaces
        .replace(/^(.)/, (_, chr) => chr.toLowerCase());   // lowercase first letter
}

// Capitalize String
const capitalize = ([first, ...rest]) => first.toUpperCase() + rest.join("");

// Change login form appearance
onAuthStateChanged(auth, user => {
    if (user) {
        userId = user.uid;
        loginForm.style.display = "none";
        userPanel.style.display = "block";
        userEmailSpan.textContent = `Logged in as: ${user.email}`;
        console.log("User logged in, rendering table...")
        renderTable(currentView);
    } else {
        userId = null;
        loginForm.style.display = "block";
        userPanel.style.display = "none";
        clearTable();
    }
});

// Get products from Firebase user collection
async function fetchProducts() {
    console.log("Calling fetchProducts")
    const snapshot = await getDocs(collection(db, `users/${userId}/products`));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get columns from Firebase column collection
async function fetchColumns(getActive = true, tableType = "inventory", keepDefaultOrder = false) {
    console.log("Fetching columns", getActive, tableType, keepDefaultOrder)
    const columnMap = new Map();

    // Include default columns
    const defaultArray =
        tableType === "inventory"
            ? DEFAULT_COLUMNS
            : DEFAULT_SHOPPING_COLUMNS;

    // 1️⃣ Insert defaults first
    defaultArray.forEach((col, index) => {
        columnMap.set(col.key, {
            ...col,
            system: true,
            defaultOrder: index
        });
    });

    // 2️⃣ Fetch Firestore overrides
    const snapshot = await getDocs(
        collection(db, `users/${userId}/columns`)
    );

    snapshot.docs.forEach(doc => {
        const data = doc.data();

        const isDefault = defaultArray.some(
            col => col.key === data.key
        );

        columnMap.set(data.key, {
            id: doc.id,
            ...columnMap.get(data.key), // preserve defaults if exist
            ...data,
            system: isDefault,
            order: keepDefaultOrder
                ? columnMap.get(data.key)?.defaultOrder
                : data.order
        });
    });
    
    const arr = Array.from(columnMap.values())
    let finalArr = arr;

    // only get active columns
    if (getActive === true) {
        console.log("Getting active columns")
        finalArr = arr.filter(col => col.active !== false)
                .sort((a, b) => a.order - b.order);
    }
    else {
        console.log("Getting all columns")
    }

    // get columns by their default order
    console.log(keepDefaultOrder, tableType);
    if (keepDefaultOrder && tableType === "shopping-list-table") {
        console.log("Using default order for shopping list");
        return finalArr.sort((a, b) => {
            // Push Predicted CU column to the very bottom
            if (a.key === "predictedCU") return 1;                    
            if (b.key === "predictedCU") return -1;                    

            let aIndex = DEFAULT_SHOPPING_COLUMNS.findIndex(d => d.key === a.key);
            let bIndex = DEFAULT_SHOPPING_COLUMNS.findIndex(d => d.key === b.key);

            if (aIndex === -1) aIndex = Infinity;
            if (bIndex === -1) bIndex = Infinity;

            return aIndex - bIndex;
        })
    }

    return finalArr.sort((a, b) => {
        const aOrder = a.orderTemp ?? a.order;
        const bOrder = b.orderTemp ?? b.order;
        return aOrder - bOrder;
    });
}      

// Set columns active/inactive
// To do: update column per view rather than globally
async function updateColumn(column, updates) { 
    console.log("Updating column:", column, updates)
    if (!column?.key) {
        throw new Error("updateColumn: column.key is required");
    }

    const userColumnsRef = collection(db, `users/${userId}/columns`);

    if (column.id) {
        await updateDoc(
            doc(userColumnsRef, column.id),
            { ...updates }
        );
        return;
    }

    const defaultCol = DEFAULT_COLUMNS.find(c => c.key === column.key);

    if (defaultCol) {
        // Create Firestore override based on default + updates
        await addDoc(userColumnsRef, {
            ...defaultCol,
            ...updates,
            system: false,      // now user-controlled
            active: updates.active ?? defaultCol.active ?? true
        });
        return;
    }

    throw new Error(`updateColumn: Unknown column "${column.key}"`);
}

// Get this column's options (for selects)
function getColumnOptions(products, columnKey) {
    const values = new Set();

    products.forEach(product => {
        const value = product[columnKey];
        if (value) {
            values.add(value);
        }
    });

    return Array.from(values);
    }

// Make this row editable
// Track {productID: countCU} before change
let currentCount = {};

async function editRow(rowIndex, product, products, table, canCancel = true) {
    // const table = document.getElementById("inventory");
    const row = table.rows[rowIndex + 1]; // skip header
    const columns = await fetchColumns();

    // Clear row
    row.innerHTML = "";

    // Create editable cells
    columns.forEach(col => {
        const cell = row.insertCell();

        // Render selects with options
        if (col.type === "select") {
            const select = document.createElement("select");
            const colOptions = getColumnOptions(products, col.key);
            
            (col.options ?? []).forEach(opt => {
                const o = document.createElement("option");
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });

            colOptions.forEach(opt => {
                const o = document.createElement("option");
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });

            if (col.allowCustom) {
                const customOpt = document.createElement("option");
                customOpt.value = "__custom__";
                customOpt.textContent = "Custom...";
                select.appendChild(customOpt);
            }

            const val = product[col.key] ?? "";
            select.value = val;                    
            select.dataset.key = col.key;

            select.addEventListener("change", () => {
                if (select.value === "__custom__") {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.placeholder = "Enter custom value";
                    input.dataset.key = col.key;
                    select.replaceWith(input);
                }
            });

            cell.appendChild(select);
        }
        // Render inputs
        else {
            
            // Temporarily store count
            if (col.key === "countCU") {
                currentCount[product.id] = Number(product[col.key]);
            }

            const input = document.createElement("input");
            input.value =
                product[col.key]?.text ??
                product[col.key] ??
                "";
            input.dataset.key = col.key;
            input.type = col.type === "number" ? "number" :
                        col.type === "date" ? "date" : "text";

            // Shortcut (save product by pressing enter)
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    saveRow(product, rowIndex);
                }
            })

            cell.appendChild(input);
        }
    });

    // Actions cell
    const actionsCell = row.insertCell();

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "saveButton";
    saveBtn.addEventListener("click", () => saveRow(product, rowIndex));

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "cancelButton";
    if (product.isTemp) {
        cancelBtn.addEventListener("click", () => deleteTemporary(product.id));
    } else {
        cancelBtn.addEventListener("click", () => lockRow(product));
    }

    actionsCell.append(saveBtn, cancelBtn);
}

// Lock row
function lockRow(product) {
    delete currentCount[product.id]; // delete temporary entry
    renderTable(currentView);
}

// Save this row
// To do: If countCU was changed, log it to Firestore users/${userId}/products
async function saveRow(product, rowIndex) {
    const productId = product.id;
    const table = document.getElementById("inventory");
    const row = table.rows[rowIndex + 1];
    const fields = row.querySelectorAll("input, select");

    const productCurrentCount =
        currentCount[product.id] ?? Number(product.countCU ?? 0);

    let productNewCount = null;
    let productLog = [...(product.productLog ?? [])];

    const updatedData = {};

    fields.forEach(field => {
        const key = field.dataset.key;
        let value = field.value;

        if (field.type === "checkbox") {
            value = field.checked;
        }

        if (value === "" || value == null) return;

        if (key === "countCU") {
            productNewCount = Number(value);
        }

        updatedData[key] = value;
    });

    if (Object.keys(updatedData).length === 0) return;

    // ✅ Track consumption safely
    if (
        productNewCount !== null &&
        productNewCount < productCurrentCount
    ) {
        const consumed = productCurrentCount - productNewCount;

        productLog.push({
            value: consumed,
            timestamp: Date.now()
        });
    }

    // ✅ Trim log
    if (productLog.length > maxLog) {
        productLog = productLog.slice(-maxLog);
    }

    updatedData.productLog = productLog;
    updatedData.lastSave = Date.now();

    // ✅ Recalculate moving average
    const updatedProduct = {
        ...product,
        ...updatedData,
    };

    const weightedAverage =
        calculateMovingAverage(updatedProduct);

    updatedData.weightedAverage = weightedAverage;

    if (product.isTemp) {
        if (!updatedData.name) {
            alert("Please enter a product name.");
            return;
        }
        const docRef = await addDoc(
            collection(db, `users/${userId}/products`),
            updatedData
        );

        const index = localProducts.findIndex(p => p.id === productId);

        localProducts[index] = {
            ...updatedData,
            id: docRef.id
        };
    } else {
        await updateDoc(
            doc(db, `users/${userId}/products`, productId),
            updatedData
        );
    }
    
    renderTable(currentView);
}

// Delete a temporary entry from localProducts
function deleteTemporary(id) {
    localProducts.pop(id);
    renderTable(currentView);
}

// Delete this row
async function deleteRow(id, index) {
    const confirmed = confirm("Are you sure?");
    if (!confirmed) return;

    try {
        console.log("Deleting product:", id)
        await deleteDoc(doc(db, `users/${userId}/products`, id));
        renderTable(currentView);
    } catch (err) {
        console.error(err);
        alert("Unable to delete product.")
    }
}

// Set this column to visible / invisible
function toggleEye(column, columnActive) {
    updateColumn(column, {active: columnActive}); 
    renderTable(currentView);
}

// Open a column filter popup
function openFilterPopup(event, column, products) {
    // close all popups
    document.querySelectorAll(".popup").forEach(p => p.remove());

    const popup = document.createElement("div");
    popup.className = "popup";
    popup.id = "filter-popup"

    popup.innerHTML = `
        <button data-sort="asc">▲ Ascending</button>
        <button data-sort="desc">▼ Descending</button>
        <hr>
    `;

    // Update table state
    popup.querySelector('[data-sort="asc"]').onclick = () => {
        console.log("Sorting ascending");
        tableState.sorting = { key: column.key, direction: "asc" };
        renderTable(currentView);
    };
    popup.querySelector('[data-sort="desc"]').onclick = () => {
        tableState.sorting = { key: column.key, direction: "desc" };
        renderTable(currentView);
    };
    

    console.log("Opening popup. Products:", products);
    // Get unique values
    const values = [...new Set(
        products
            .map(p => p[column.key]?.text ?? p[column.key])
            .filter(v => v !== null && v !== undefined && v !== "")
    )];

    const activeFilters = tableState.filters[column.key] || [];

    // Create checkboxes
    const table = document.createElement("div");

    values.forEach(value => {
        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        // checked if 
        checkbox.checked = activeFilters.includes(value);
        checkbox.value = value;

        label.appendChild(checkbox);
        label.append(value);

        table.appendChild(label);
    });

    table.querySelectorAll("input").forEach(cb => {
        cb.addEventListener("change", () => {
            const checked = [...table.querySelectorAll("input:checked")]
                .map(i => i.value);
            tableState.filters[column.key] = checked;
            renderTable(currentView);
        });

    });

    popup.appendChild(table);

    // Filter numbers
    if (column.type === "number") {

        const btn = document.createElement("button");

        btn.textContent = "Above 0";

        btn.onclick = () => {
            tableState.filters[column.key] = "above0";
            renderTable(currentView);
        };

        popup.appendChild(btn);
    }

    // Clear filters
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "🗑️ Clear Filter";
    clearBtn.onclick = () => {
        delete tableState.filters[column.key];
        renderTable(currentView);
    };
    popup.appendChild(clearBtn);


    document.body.appendChild(popup);

    popup.style.position = "absolute";
    popup.style.left = event.pageX + "px";
    popup.style.top = event.pageY + "px";

    // Close the popup
    setTimeout(() => {
        const closePopup = (e) => {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener("click", closePopup);
            }
        }
        document.addEventListener("click", closePopup);
    }, 0);
}

// Helper function
function applyFilters(products) {
    return products.filter(product => {
        // Global search
        if (tableState.search) {
            const search = tableState.search;

            const matches = Object.values(product).some(val => {
                const v = val?.text ?? val;

                if (v == null) return false;

                return String(v).toLowerCase().includes(search);
            });

            if (!matches) return false;
        }

        // Column Filters
        for (const key in tableState.filters) {
            const filter = tableState.filters[key];
            const value = product[key]?.text ?? product[key];
            if (filter === "above0") {
                if (!(Number(value) > 0)) return false;
            }
            if (Array.isArray(filter)) {
                if (!filter.includes(value)) return false;
            }
        }
        return true;
    });
}

function mergeProducts(fetchedProducts, checkDeleted = true, keepTemporary = true) {

    if (!localProducts) {
        return fetchedProducts;
    }

    const map = new Map();

    // Add existing local products
    localProducts.forEach(p => {
        map.set(p.id, p);
    });

    // Track fetched IDs (for deletion check)
    const fetchedIds = new Set();

    // Merge fetched data
    fetchedProducts.forEach(fp => {
        fetchedIds.add(fp.id);

        if (map.has(fp.id)) {
            const existing = map.get(fp.id);

            map.set(fp.id, {
                ...existing, // keep local fields
                ...fp        // overwrite with Firestore data
            });
        } else {
            map.set(fp.id, fp);
        }
    });

    // Handle deleted products
    if (checkDeleted) {
        for (const [id, product] of map.entries()) {
            if (!fetchedIds.has(id)) {
                if (keepTemporary && product.isTemp) continue;
                map.delete(id);
            }
        }
    }

    const result = Array.from(map.values());
    console.log("Merged: ", result);
    return result;
}

// Handle menu actions
function handleMenuAction(action) {
    if (action === "Rearrange columns" || action === "Lock columns") {
        isRearranging = (action === "Rearrange columns") ? true : false;
        renderTable(currentView);
    }
}

// Render the menu bar
function renderMenu(tableType = "stock-table") {
    const menuBar = document.getElementById("menuBar");
    menuBar.innerHTML = "";

    const merged = {
        ...menu.global,
        ...(menu[tableType] || {})
    };

    Object.entries(merged).forEach(([group, items]) => {
        const wrapper = document.createElement("div");
        wrapper.className = "menu";

        const title = document.createElement("button");
        title.className = "menu-title";
        title.textContent = capitalize(group);

        const dropdown = document.createElement("div");
        dropdown.className = "menu-dropdown";

        items.forEach(item => {
            const btn = document.createElement("button");
            btn.textContent = item;

            btn.onclick = () => {
                handleMenuAction(item);
                closeMenus();
            }

            dropdown.appendChild(btn);
        });

        // On click
        title.addEventListener("click", (e) => {
            e.stopPropagation();

            if (activeMenu === dropdown) {
                closeMenus();
            } else {
                openMenu(dropdown);
            }
        });

        // On hover
        wrapper.addEventListener("mouseenter", () => {
            if (activeMenu) {
                openMenu(dropdown);
            }
        })

        wrapper.appendChild(title);
        wrapper.appendChild(dropdown);
        menuBar.appendChild(wrapper);
    })
}

// Open a popup menu
function openMenu(dropdown) {
    closeMenus();
    dropdown.style.display = "flex";
    activeMenu = dropdown;
}

// Close all popups
function closeMenus() {
    document.querySelectorAll(".menu-dropdown")
        .forEach(d => d.style.display = "none");
    
        activeMenu = null;
}

// Removes line at new column drag position
function clearDragIndicators() {
    document.querySelectorAll("th")
        .forEach(el => { el.classList.remove("drag-left", "drag-right"); })
}

// Render the table
// Reuse this function for shopping list
async function renderTable(
    type="inventory",
    columnVisibilityEditable=true,
    filteringEnabled=true,
    temporaryAtBottom = true
) {

    const table = document.getElementById(type);
    table.innerHTML = "";
    
    // get current data from Firestore
    let products = await fetchProducts();

    // use local data if available
    if (localProducts.length > 0) {
        // console.log(localProducts);
        products = mergeProducts(products); // updates local data
    }
    else localProducts = products;      

    // table.innerHTML = "<tr><th>Name</th><th>Count</th><th>Price</th><th><button id='addColumnBtn'>+<button></th></tr>";
    const headerRow = document.createElement("tr");

    // Get columns from Firestore
    const getActive = (showCols === "active");

    // To do: apply view settings here
    const keepDefaultOrder = (type === "shopping-list-table"); // keep default column order in shopping list

    let columns = [];
    
    // Initialize
    if (currentColumns.length === 0) {
        columns = await fetchColumns(getActive, type, keepDefaultOrder); // fetches default or default shopping list columns
        
        columns.forEach((col, i) => {
            col.order = col.order ?? i;
            col.orderTemp = col.order;
        })

        currentColumns = columns.map(c => ({...c}));
        console.log("Initialized currentColumns:", currentColumns)
    } else {
        columns = currentColumns;
    }

    for (const column of columns) {
        const th = document.createElement("th");
        th.dataset.key = column.key;

        const label = document.createElement("span");
        label.className = "th-label";
        label.textContent = column.keyText;

        th.appendChild(label);

        if (columnVisibilityEditable) {
            const eyeBtn = document.createElement("button");
            if (column.active) {
                eyeBtn.textContent = "👁️";
                eyeBtn.onclick = function(){toggleEye(column, false);} // toggle "inactive" (false)
            }
            else {
                eyeBtn.textContent = "⌣";
                eyeBtn.onclick = function(){toggleEye(column, true);} // toggle "active" (true)
            }
            th.appendChild(eyeBtn);
        }
        

        // Filter buttons

        if (filteringEnabled) {
            const filterBtn = document.createElement("button");
            filterBtn.textContent = "⋮";
            filterBtn.className = "filterButton";
            //console.log(products);
            filterBtn.addEventListener("click", (e) => {
                openFilterPopup(e, column, localProducts);
            });

            th.appendChild(filterBtn);
        }

        // Rearrange columns

        if (isRearranging && !column.isFixedCol) {
            const handle = document.createElement("span");
            handle.textContent = "≡";
            handle.className = "drag-handle";

            th.appendChild(handle);

            th.draggable = true;

            // Drag start
            th.addEventListener("dragstart", () => {
                draggedKey = column.key;
                isDragging = true;
            });

            // Drag over
            th.addEventListener("dragover", (e) => {
                e.preventDefault();

                const rect = th.getBoundingClientRect();
                const mid = rect.left + rect.width / 2;

                const isLeft = e.clientX < mid;
                
                if ((isLeft && !th.classList.contains("drag-left")) || (!isLeft && !th.classList.contains("drag-right"))) {
                    clearDragIndicators();
                    th.classList.add(isLeft ? "drag-left" : "drag-right");
                } 
            })

            // Drop
            th.addEventListener("drop", (e) => {
                e.preventDefault();

                if (!draggedKey || draggedKey === column.key) return;

                const rect = th.getBoundingClientRect();
                const mid = rect.left + rect.width / 2;

                const insertBefore = e.clientX < mid;

                reorderTempColumns(draggedKey, column.key, insertBefore);

                clearDragIndicators();
                
            })

            // Drag ended
            th.addEventListener("dragend", () => {
                if (!isDragging) return;

                isDragging = false;

                finalizeColumnOrder();
                clearDragIndicators();

                draggedKey = null;

                renderTable(currentView);
            })
        }

        headerRow.appendChild(th);
    }    

    // In shopping list, show predicted CU

    // if (type === "shopping-list-table") {
    //     const predictedTh = document.createElement("th");
    //     predictedTh.textContent = "Predicted Count (CU)";
    //     headerRow.appendChild(predictedTh);
    // }

    const actionTh = document.createElement("th");
    const addColBtn = document.createElement("button");
    addColBtn.textContent = "+";
    addColBtn.addEventListener("click", () => {
        addColumnForm.classList.toggle("hidden");
        // click newKeyBtn
        addColumnRow();
    });
    actionTh.appendChild(addColBtn);

    headerRow.appendChild(actionTh);
    table.appendChild(headerRow);

    let filteredProducts = applyFilters(products);

    if (tableState.sorting) {
        const { key, direction } = tableState.sorting;
        filteredProducts.sort((a,b) => {
            const va = a[key]?.text ?? a[key];
            const vb = b[key]?.text ?? b[key];
            if (va < vb) return direction === "asc" ? -1 : 1;
            if (va > vb) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    if (temporaryAtBottom) {
        const normal = [];
        const temp = [];

        filteredProducts.forEach(p => {
            if (p.isTemp) temp.push(p);
            else normal.push(p);
        });

        filteredProducts = [...normal, ...temp];
    }

    // Create table rows dynamically
    filteredProducts.forEach((item, index) => {
        const row = table.insertRow(-1); // add row at the end
        if (item.isTemp) {
            row.classList.add("temp");
        }

        for (const col of columns) {
            const cell = row.insertCell();
            const value = item[col.key];
            // console.log(col);
            cell.textContent = value ?? "";
        }

        const actionsCell = row.insertCell();
        actionsCell.className = "actions";

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.className = "editButton";
        editBtn.addEventListener("click", () => editRow(index, item, products, table));
        actionsCell.appendChild(editBtn);

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.className = "deleteButton";
        deleteBtn.addEventListener("click", () => deleteRow(item.id, index));
        actionsCell.appendChild(deleteBtn);

        // Toggle temporary items editable
        if (item.isTemp) {
            editRow(index, item, products, table);
        }

        // (To do) Add remaining keys, values if custom exist
    });

    // Add a "New Item" button and show addForm

}

// Locally store column order while dragging
function reorderTempColumns(draggedKey, targetKey, insertBefore) {

    const cols = [...currentColumns];

    const from = cols.findIndex(c => c.key === draggedKey);
    let to = cols.findIndex(c => c.key === targetKey);

    const [moved] = cols.splice(from, 1);

    // adjust index if needed
    if (!insertBefore) to++;

    cols.splice(to, 0, moved);

    cols.forEach((c, i) => {
        c.orderTemp = i;
    });

    currentColumns = cols;
}

// Save column order after dragging
async function finalizeColumnOrder() {
    const changed = currentColumns.some(c => c.order !== c.orderTemp)

    if (!changed) return;

    for (const col of currentColumns) {
        if (col.isFixedCol) continue;

        if (col.order !== col.orderTemp) {
            col.order = col.orderTemp;

            if (col.id) {
                console.log("Updating column order:", col);
                await updateDoc(doc(db, `users/${userId}/columns`, col.id), { order: col.order });
            } else {
                console.log("Column has no id:", col);
            }
        }
    }
    renderTable(currentView);
}

// Login form
const loginForm = document.getElementById("loginForm");
const userPanel = document.getElementById("userPanel");
const userEmailSpan = document.getElementById("userEmail");

loginForm.addEventListener("submit", async (e) => {
e.preventDefault();

const email = loginForm.email.value;
const password = loginForm.password.value;

// Sign user in
try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Optional: hide login form and show main app
    loginForm.style.display = "none";
    userPanel.style.display = "block";
    userEmailSpan.textContent = `Logged in as: ${user.email}`;
    
} catch (error) {
    console.error(error.code, error.message);
    alert("Login failed: " + error.message);
}
});

// Sign user out
signOutBtn.addEventListener("click", async () => {
    await signOut(auth);

    // Reset UI
    loginForm.style.display = "block";
    userPanel.style.display = "none";
    loginForm.reset();
    clearTable();
});

// Clear the table
function clearTable() {
    document.getElementById("inventory").innerHTML = "";
};

function addTemporaryItem() {
    const tempId = "temp-" + Date.now();

    const newProduct = {
        id: tempId,
        isTemp: true,
        name: "",
        countCU: 0,
    };

    localProducts.push(newProduct);
    console.log("Added temporary item: ", localProducts);

    renderTable(currentView);
}

// Add item button
/*  Adds a temporary item to the table
    Item is stored in Firestore once user submits */
const addItemBtn = document.getElementById("add-item-button");
addItemBtn.addEventListener("click", addTemporaryItem);

// Add item form
const form = document.getElementById("addForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value;
    const qty = Number(form.quantity.value);
    const price = Number(form.price.value);

    /* Validate */
    if (!name) {
        alert("Please enter a product name!");
        return;
    }
    if (qty<0) {
        alert("Please enter a valid product count!");
        return;
    }
    if (price<0) {
        alert("Please enter a valid price!");
        return;
    }

    // Check custom fields

    try {
        await addDoc(collection(db, `users/${userId}/products`), {
            name: name,
            countCU: qty,
            price: price
            // Custom fields
        });
        form.reset();
        renderTable(currentView);
    }
    catch (err) {
        console.error(err);
        alert("Could not add product.")
    }
                
});

// Create a new product category column (e.g., "Weight", "Best Before" etc.)
const newColumnForm = document.getElementById("addColumnForm");

newColumnForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Save new column to firestore
    const rows = newColumnForm.querySelectorAll(".column-row");

    for (const row of rows) {
        const columns = await fetchColumns();
        const existingKeys = columns.map(c => c.keyText);

        const column = row.querySelector("input").value;
        const type = row.querySelector("select").value;

        // Check input
        if (!column) {
            alert("Invalid input");
            return;
        }

        if (existingKeys.includes(column)) {
            alert("Column already exists.");
            return;
        }

        const columnData = {
                key: toCamelCase(column),
                keyText: column,
                type: type,
                active: true,
                order: existingKeys.length
            }

        // Store select options, allow custom options
        if (type === "select") {
            const options = [...row.querySelectorAll(".optionInput")]
                .map(i => i.value)
                .filter(Boolean);

            const allowCustom = row.querySelector(".allow-custom")?.checked ?? true;
            
            if (!allowCustom && options.length === 0) {
                alert("Either allow custom options or provide at least 1 option.");
                return;
            }

            columnData.options = options;
            columnData.allowCustom = allowCustom;
        }

        
        // Save to Firestore
        try {
            await addDoc(collection(db, `users/${userId}/columns`), columnData);
            resetAddColumnForm();
            renderTable(currentView);
        }
        catch (err) {
            console.error(err);
            alert("Could not add column.");
        }
    }
})

// Remove all add item form rows except the first
function resetAddColumnForm() {
    addColumnForm.classList.add("hidden");
    
    const rows = Array.from(addColumnForm.querySelectorAll("div"));
    rows.forEach((row, i) => {
        if (i !== 0) row.remove();
    });

    // Optionally, reset the first row inputs
    const firstRowInputs = rows[0]?.querySelectorAll("input, select");
    firstRowInputs?.forEach(input => {
        if (input.tagName === "INPUT") input.value = "";
        if (input.tagName === "SELECT") input.selectedIndex = 0;
    });
}

const cancelBtn = document.getElementById("columnCancelBtn");

// Reset the add-item form
cancelBtn.addEventListener("click", () => {
    resetAddColumnForm();
});

// Add column to add-item form
function addColumnRow() {
    const row = document.createElement("div");
    row.className = "column-row";

    // Key input
    const keyLabel = document.createElement("label");
    keyLabel.textContent = "Key:";
    row.appendChild(keyLabel);

    const keyInput = document.createElement("input");
    keyInput.placeholder = "Column key";
    row.appendChild(keyInput);

    // Datatype select
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "Datatype:";
    row.appendChild(typeLabel);

    // To do: add "select" option
    const typeSelect = document.createElement("select");
    ["text", "number", "date", "select"].forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
    row.appendChild(typeSelect);

    typeSelect.addEventListener("change", () => {
        if (typeSelect.value === "select") {
            createSelectForm(row);
        } else {
            removeSelectForm(row);
        }
    });

    // Remove button
    const removeKeyBtn = document.createElement("button");
    removeKeyBtn.type = "button";
    removeKeyBtn.textContent = "-";
    removeKeyBtn.addEventListener("click", () => row.remove());
    row.appendChild(removeKeyBtn);

    // Insert row above Cancel/Save buttons
    addColumnForm.insertBefore(row, newKeyBtn);
}

newKeyBtn.addEventListener("click", () => {
    addColumnRow();
});

// Create a select form in add-item form when user chooses "select"
function createSelectForm(row) {
    if (row.querySelector(".select-form")) return;

    const form = document.createElement("div");
    form.className = "select-form";

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "options-container";

    form.appendChild(optionsContainer);
    addOptionRow(optionsContainer);

    // + button
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.addEventListener("click", () => addOptionRow(optionsContainer));

    // Allow custom checkbox
    const customLabel = document.createElement("label");
    const customCheckbox = document.createElement("input");
    customCheckbox.type = "checkbox";
    customCheckbox.className = "allow-custom";

    customLabel.append(customCheckbox, "Allow custom options");

    // Optional update: Get options from cell / column / table

    form.append(addBtn, customLabel);
    row.appendChild(form);
}

// Remove form if it exists
function removeSelectForm(row) {
    const selectForm = row.querySelector(".select-form");
    if (selectForm) {
        selectForm.remove();
    }
}

// Add a new row to add-item row
function addOptionRow(container) {
    const div = document.createElement("div");
    div.className = "option-row";

    const input = document.createElement("input");
    input.placeholder = "Option value";
    input.className = "optionInput";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "-";
    removeBtn.addEventListener("click", () => div.remove());

    div.append(input, removeBtn);
    container.appendChild(div);
}

const showHideBtn = document.getElementById("show-hide-btn")
showHideBtn.addEventListener("click", () => toggleColumnVisibility())

// Show all columns / Hide inactive
function toggleColumnVisibility() {
    if (showCols === "active") {
        showCols = "all";
        showHideBtn.textContent = "Hide inactive columns";
        renderTable(currentView);
        return;
    }
    
    showCols = "active";
    showHideBtn.textContent = "Show all columns";
    renderTable(currentView);
}

function getTodayStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function calculateMovingAverage(product, includeZeroConsumption = true) {
    console.log("Calculating weighted average for: " + product.name);
    const w = 0.6;
    const todayStart = getTodayStart();
    const startDatetime = product.lastSave ?? 0;

    if (!product.productLog?.length) {
        console.log("Product has no product log.")
        return 0;
    }

    const validLogs = product.productLog.filter(entry =>
        entry.timestamp < todayStart
    );

    if (!validLogs.length) {
            console.log("No valid logs. Check product:");
            console.log(product);
            return 0;
    }

    // Group by day
    const dayMap = {};

    for (const entry of validLogs) {
        const date = new Date(entry.timestamp);
        const dayKey = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        ).getTime();

        dayMap[dayKey] = (dayMap[dayKey] || 0) + entry.value;
    }

    let daySums;

    if (!includeZeroConsumption) {
        // Only days with activity
        const sortedDays = Object.keys(dayMap)
            .map(Number)
            .sort((a, b) => a - b);

        daySums = sortedDays.map(day => dayMap[day]);

    } else {
        // Include zero days
        
        const earliestTimestamp = Math.min(
            ...validLogs.map(e => e.timestamp)
        );

        const earliestDate = new Date(earliestTimestamp);
        let currentDay = new Date(
            earliestDate.getFullYear(),
            earliestDate.getMonth(),
            earliestDate.getDate()
        ).getTime();

        daySums = [];

        while (currentDay < todayStart) {
            daySums.push(dayMap[currentDay] || 0);
            currentDay += 24 * 60 * 60 * 1000; // +1 day
        }
    }

    if (!daySums.length) {
        console.log ("No day sums.");
        return 0;
    }

    // Exponential weighted moving average
    let weightedAvg = daySums[0];

    for (let i = 1; i < daySums.length; i++) {
        weightedAvg = w * daySums[i] + (1 - w) * weightedAvg;
    }

    console.log(weightedAvg);

    return weightedAvg;
}

const showStockButton = document.querySelector("#show-stock-table");
const showShoppingListButton = document.querySelector("#show-shopping-list");
const stockTableView = document.querySelector(".stock-table");
const shoppingListView = document.querySelector(".shopping-list");

showStockButton?.addEventListener("click", () => {
    currentView = "inventory";
    // Show this
    stockTableView.classList.remove("hidden");
    showStockButton.classList.add("active-view")

    // Hide all other views
    shoppingListView.classList.add("hidden");
    showShoppingListButton.classList.remove("active-view");

    currentColumns = [];
    resetSearchInputs();
    renderMenu();
})

showShoppingListButton?.addEventListener("click", () => {
    currentView = "shopping-list-table"
    // Show
    shoppingListView.classList.remove("hidden");
    showShoppingListButton.classList.add("active-view")
    // Update shopping list


    // Hide all other views
    stockTableView.classList.add("hidden");
    showStockButton.classList.remove("active-view");

    currentColumns = [];
    resetSearchInputs();
    renderMenu();
    //initialiseShoppingList();
})

async function initialiseShoppingList(date = null) {
    console.log("Initialising")
    if (!date) {
        date = setTodayAsDefault();
    }


    // Predict future stock
    let products = await fetchProducts();
    products = predictStock(products, date); // To do: store data temporarily
    console.log("Predicted: ", products);
    localProducts = products;


    // Render table
    // renderTable("shopping-list-table", products, false); // column visibility not editable
}

function predictStock(products, dateString, decimals=1) {
    console.log("Predicting future stock")
    const todayStart = getTodayStart();

    // Convert "YYYY-MM-DD" to local Date at 00:00
    const selectedDate = new Date(dateString);
    const targetDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
    );

    const msPerDay = 24 * 60 * 60 * 1000;

    const dayCount = Math.max(
        0,
        Math.floor((targetDate - todayStart) / msPerDay)
    );
    
    return products.map(product => {

        const weightedAverage = Number(product.weightedAverage ?? 0);
        const currentCU = Number(product.countCU ?? 0);

        const predictedCU =
            currentCU - dayCount * weightedAverage;

        return {
            ...product,
            predictedCU: predictedCU.toFixed(decimals) 
        };
    });
}

const shoppingDateInput = document.getElementById("shoppingDate");

// Initialise shopping list
showShoppingListButton.addEventListener("click", () => {
    const selectedDate = shoppingDateInput.value;
    initialiseShoppingList(selectedDate);
    renderTable("shopping-list-table", localProducts, false)
})

// Update shopping list
shoppingDateInput.addEventListener("change", () => {
    const selectedDate = shoppingDateInput.value;
    initialiseShoppingList(selectedDate);
    renderTable("shopping-list-table", localProducts, false)
});

function setTodayAsDefault() {
    function getLocalISODate() {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split("T")[0];
    }
    return getLocalISODate();
}

shoppingDateInput.value = setTodayAsDefault();

// Avoids slippage with inputs
function debounce(fn, delay = 150) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    }
}

const searchInputs = document.querySelectorAll(".searchInput");

function resetSearchInputs() {
    searchInputs.forEach(input => {
        input.value = "";
    })
    tableState.search = "";
    renderTable(currentView);
}

const handleSearch = debounce((value) => {
    tableState.search = value.toLowerCase().trim();
    renderTable(currentView);
}, 150);

searchInputs.forEach(input => {
    input.addEventListener("input", (e) => {
        handleSearch(e.target.value);
    });
})

document.addEventListener("click", closeMenus);

renderMenu();