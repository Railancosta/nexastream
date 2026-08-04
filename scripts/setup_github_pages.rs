// Rust script para configurar GitHub Pages e fazer deploy
// Compile: rustc setup_github_pages.rs -o setup_github_pages
// Usage: GITHUB_TOKEN=xxx ./setup_github_pages

use std::env;
use std::process::Command;

fn main() {
    println!("🚀 NexaStream - Setup GitHub Pages\n");

    let github_token = env::var("GITHUB_TOKEN")
        .expect("❌ GITHUB_TOKEN não está configurado!");
    
    let repo = "Railancosta/nexastream";
    
    println!("📋 Configurando GitHub Pages...");
    
    // Configurar GitHub Pages via API
    let output = Command::new("curl")
        .args(&[
            "-X", "PUT",
            "-H", &format!("Authorization: token {}", github_token),
            "-H", "Accept: application/vnd.github+json",
            "-H", "X-GitHub-Api-Version: 2022-11-28",
            "-H", "Content-Type: application/json",
            &format!("https://api.github.com/repos/{}/pages", repo),
            "-d", r#"{
                "build_type": "workflow",
                "source": {
                    "branch": "main",
                    "path": "/"
                }
            }"#
        ])
        .output()
        .expect("Falha ao executar curl");

    let response = String::from_utf8_lossy(&output.stdout);
    
    if response.contains("html_url") {
        println!("✅ GitHub Pages habilitado com sucesso!");
        println!("📌 Site: https://Railancosta.github.io/nexastream");
    } else if response.contains("already") {
        println!("⚠️ GitHub Pages já está configurado");
    } else {
        println!("❌ Erro: {}", response);
    }

    println!("\n✅ Configuração concluída!");
}
