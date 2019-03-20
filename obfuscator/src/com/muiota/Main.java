package com.muiota;

import java.io.IOException;

public class Main {

    public static void main(String[] args) throws IOException {
        Obfuscator obfuscator = new Obfuscator();
        obfuscator.process("..\\src\\telechart.min.js",
                "..\\src\\telechart.f.js");
    }
}
