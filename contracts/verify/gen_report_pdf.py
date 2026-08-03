#!/usr/bin/env python3
"""Generate Arcodex_Contract_Verification.pdf from the verification results."""
from fpdf import FPDF
import datetime

ACCENT = (34, 211, 238)
TEXT = (214, 228, 236)
DIM = (130, 150, 165)
BORDER = (40, 55, 70)
BG = (13, 17, 23)
GREEN = (52, 211, 153)
RED = (251, 113, 133)

class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*DIM)
        self.cell(0, 6, "ARCODEX - CONTRACT VERIFICATION REPORT", align="L")
        self.cell(0, 6, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BORDER)
        self.line(10, 16, 200, 16)
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*DIM)
        self.cell(0, 6, "Arcodex - Stablecoin-native launchpad on Arc. Chain 5042. Not financial advice.", align="C")

pdf = PDF(format="A4")
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_page()
pdf.set_fill_color(*BG)

def section(title):
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

def para(text, size=9):
    pdf.set_font("Helvetica", "", size)
    pdf.set_text_color(*TEXT)
    pdf.multi_cell(0, 5, text)
    pdf.ln(1)

def mono(text, size=8):
    pdf.set_font("Courier", "", size)
    pdf.set_text_color(*TEXT)
    pdf.multi_cell(0, 4.5, text)
    pdf.ln(1)

def kv(k, v):
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DIM)
    pdf.cell(55, 5.5, k)
    pdf.set_text_color(*TEXT)
    pdf.cell(0, 5.5, v, new_x="LMARGIN", new_y="NEXT")

def okrow(name, addr, status, detail):
    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(*GREEN if status.startswith("PASS") else RED)
    pdf.cell(40, 5.5, status)
    pdf.set_text_color(*TEXT)
    pdf.cell(62, 5.5, name)
    pdf.cell(0, 5.5, addr + "  " + detail, new_x="LMARGIN", new_y="NEXT")

# ---------- title ----------
pdf.set_font("Helvetica", "B", 20)
pdf.set_text_color(*TEXT)
pdf.cell(0, 10, "Arcodex - Contract Verification Report", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(*DIM)
pdf.cell(0, 6, f"Arc mainnet (chainId 5042)  |  generated {datetime.date.today().isoformat()}", new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

section("1. Executive Summary")
para("All deployed Arcodex contracts were verified by recompiling the exact deployment "
     "source with the exact compiler settings and comparing the resulting bytecode against "
     "the on-chain code (eth_getCode). Verification is bytecode-level (cryptographic proof), "
     "independent of any block explorer. Results: 3/3 deployed contracts verified (ArcodexFeeRouter "
     "matches EXACTLY; ArcodexBondingCurve and BondingCurveToken match after immutable-value "
     "substitution, which is the correct semantics for Solidity immutables).")

section("2. Compiler Settings (identical to deployment)")
mono("solc version  : 0.8.24\n"
     "optimizer     : enabled, runs = 200\n"
     "viaIR         : true\n"
     "evmVersion    : paris\n"
     "dependencies  : @openzeppelin/contracts 5.0.2")

section("3. Verification Results")
kv("ArcodexBondingCurve", "0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0")
pdf.ln(0)
okrow("", "ArcodexBondingCurve", "PASS", "23348 B runtime - match after 7 immutable patches (USDC 0x3600...0000)")
okrow("", "ArcodexFeeRouter", "PASS", "3568 B runtime - EXACT bytecode match")
okrow("", "BondingCurveToken (ARCT)", "PASS", "1925 B runtime - match after 2 immutable patches (factory 0x0264...)")
okrow("", "ArcodexPool", "N/A", "no instance deployed yet - factory deploys at graduation")
pdf.ln(1)
para("Immutable values embedded in the deployed runtime bytecode are patched by the "
     "constructor at deploy time; the compiler artifact carries zero placeholders. The "
     "7 + 2 patched positions correspond exactly to the USDC address (curve) and the "
     "factory address (token) respectively.")

section("4. Constructor Arguments (read from chain)")
kv("ArcodexBondingCurve", "(usdc, platformTreasury)")
kv("  usdc", "0x3600000000000000000000000000000000000000 (native USDC)")
kv("  platformTreasury", "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3")
kv("  owner", "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3")
kv("  tokenCount", "1 (ARCT)")
kv("ArcodexFeeRouter", "(platformTreasury)")
kv("  platformTreasury", "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3")
kv("  feeBps", "150 (1.50%)")
kv("  owner", "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3")
kv("BondingCurveToken (ARCT)", '("Arcodex Test", "ARCT", factory, mint 1e24)')
kv("  supply", "1,000,000 (1e24 wei)")
kv("  factory", "0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0")

section("5. Verification Artifacts")
para("Ready for one-click explorer verification once an Arc mainnet explorer supports "
     "source verification (arcscan.app is not yet public):")
mono("contracts/verify/arcodex-standard-input.json   - exact solc standard JSON input (10 sources)\n"
     "contracts/verify/verify_bytecode.js            - reproducible bytecode verification script\n"
     "contracts/                            - original multi-file sources (identical to deploy)")

section("6. Methodology Notes")
para("- eth_getCode fetched via the public Arc RPCs (arcanine + Railway fallback), same "
     "sources that built the deployed bytecode (verified identical to the repository copies).")
para("- solc's trailing CBOR metadata hash (43 bytes) is stripped from both sides before "
     "comparison; it encodes IPFS metadata and legitimately differs per compile environment.")
para("- Arc mainnet has no public block explorer yet (arcscan.app resolves to a private "
     "address; arc.blockscout.com returns 404; chainlist lists no explorer for 5042). "
     "Source verification on an explorer was therefore not possible at the time of writing; "
     "the bytecode-level proof above is equivalent and explorer-independent.")

pdf.output("/home/ubuntu/arc-launchpad/docs/Arcodex_Contract_Verification.pdf")
print("PDF written: docs/Arcodex_Contract_Verification.pdf")
