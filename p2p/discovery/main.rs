// P2P Discovery (Item 9) — DHT-based peer discovery, content addressing
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

pub struct DHT {
    peers: Arc<Mutex<HashMap<String, Vec<SocketAddr>>>>,  // content_id -> peers
}

impl DHT {
    pub fn new() -> Self {
        Self { peers: Arc::new(Mutex::new(HashMap::new())) }
    }

    // announce que um peer possui content_id
    pub fn announce(&self, content_id: &str, peer: SocketAddr) {
        let mut map = self.peers.lock().unwrap();
        map.entry(content_id.to_string()).or_insert_with(Vec::new).push(peer);
    }

    // lookup peers que possuem content_id
    pub fn lookup(&self, content_id: &str) -> Vec<SocketAddr> {
        let map = self.peers.lock().unwrap();
        map.get(content_id).cloned().unwrap_or_default()
    }

    // replicação (Item 12)
    pub fn replication_factor(&self, content_id: &str) -> usize {
        self.lookup(content_id).len()
    }
}

fn main() {
    println!("NexaStream P2P Discovery — DHT + Content Addressing (Item 9/10)");
    let dht = DHT::new();
    let test_cid = "QmTest123";
    let peer: SocketAddr = "127.0.0.1:8000".parse().unwrap();
    dht.announce(test_cid, peer);
    println!("lookup({}) -> {:?}", test_cid, dht.lookup(test_cid));
    println!("replication_factor = {}", dht.replication_factor(test_cid));
}
