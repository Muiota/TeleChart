package com.muiota;

import java.io.IOException;

public class Main {

    public static void main(String[] args) throws IOException {
        Obfuscator obfuscator = new Obfuscator();
        obfuscator.process("..\\src\\telegraph.min.js",
                "..\\src\\telegraph.obfuscated.js");
    }
}
