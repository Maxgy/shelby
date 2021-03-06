extern crate libc;
extern crate numbat;

use std::fs::File;
use std::io::Read;
use std::path::Path;
use shelby;

pub struct Memory<'a> {
  emitter: numbat::Emitter<'a>
}

impl<'a> Memory<'a> {
  pub fn new(emitter: numbat::Emitter<'a>) -> Memory {
    Memory {
      emitter: emitter
    }
  }

  fn send(&mut self) {
    let mut file = File::open("/proc/meminfo").expect("failed to open /proc/meminfo");
    let mut content = String::new();
    file.read_to_string(&mut content).expect("failed to read /proc/meminfo");

    let lines = content.lines();

    let mut total : Option<u64> = None;
    let mut free : Option<u64> = None;
    let mut cached : Option<u64> = None;
    let mut buffers : Option<u64> = None;

    for line in lines {
      let mut split = line.split_whitespace();
      let name = split.next().expect("expected a metric name");
      let value = split.next().expect("expected a metric value");

      if name == "MemTotal:" {
        total = Some(value.parse::<u64>().expect("expected MemTotal to be parsable"));
      }
      else if name == "MemFree:" {
        free = Some(value.parse::<u64>().expect("expected MemFree to be parsable"));
      }
      else if name == "Cached:" {
        cached = Some(value.parse::<u64>().expect("expected Cached to be parsable"));
      }
      else if name == "Buffers:" {
        buffers = Some(value.parse::<u64>().expect("expected Buffers to be parsable"));
      }
    }

    let t = total.expect("expected MemTotal");
    let used =
      t -
      free.expect("expected MemFree") -
      cached.expect("expected Cached") -
      buffers.expect("expected Buffers");

    self.emitter.emit("memory", used as f64 / t as f64);
  }
}

impl<'a> shelby::ShelbyPlugin for Memory<'a> {
  fn start(&mut self) {
    if Path::new("/proc/meminfo").exists() {
        println!("starting memory plugin");
        shelby::schedule_repeating(move || {
          self.send();
        }, 10);
    } else {
        println!("skipping memory plugin; no /proc on this system");
    }
  }
}
