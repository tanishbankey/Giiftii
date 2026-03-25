let selectedBudget = null;
let selectedGender = null;

// Chip Selection Logic
document.querySelectorAll('#budget-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('#budget-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedBudget = chip.dataset.value;
        checkForm();
    });
});

document.querySelectorAll('#gender-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('#gender-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedGender = chip.dataset.value;
        checkForm();
    });
});

function checkForm() {
    const age = document.getElementById('age-range').value;
    const btn = document.getElementById('find-gifts-btn');
    btn.disabled = !(selectedBudget && selectedGender && age);
}

document.getElementById('age-range').addEventListener('change', checkForm);

// Simulate the logic in the original JSX
document.getElementById('find-gifts-btn').addEventListener('click', async () => {
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('loading-view').classList.remove('hidden');
    
    // Simulate Progress
    let prog = 0;
    const interval = setInterval(() => {
        prog += 10;
        document.getElementById('progress-fill').style.width = prog + "%";
        if(prog >= 100) {
            clearInterval(interval);
            showResults();
        }
    }, 300);
});

function showResults() {
    document.getElementById('loading-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
    
    const container = document.getElementById('results-container');
    // Mock data based on the JSX's 40-item requirement
    const mockGifts = [
        { name: "Stanley Quencher H2.0", brand: "Stanley", price: 45, reason: "Viral on TikTok for hydration trends." },
        { name: "Cloud Slippers", brand: "Bronax", price: 24, reason: "Best-selling comfort footwear 2024." }
    ];

    container.innerHTML = mockGifts.map((gift, i) => `
        <div class="gift-card">
            <small>#${i+1} — ${gift.brand}</small>
            <h3>${gift.name}</h3>
            <p class="price">$${gift.price}</p>
            <p style="font-size: 13px; color: #666;">${gift.reason}</p>
            <button class="chip" style="width:100%; margin-top:10px;">View on Amazon</button>
        </div>
    `).join('');
}

function resetApp() {
    location.reload();
}
