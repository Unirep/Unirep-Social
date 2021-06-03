// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// 2019 OKIMS

pragma solidity ^0.7.0;

library Pairing {

    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /*
     * @return The negation of p, i.e. p.plus(p.negate()) should be zero. 
     */
    function negate(G1Point memory p) internal pure returns (G1Point memory) {

        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        } else {
            return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
        }
    }

    /*
     * @return The sum of two points of G1
     */
    function plus(
        G1Point memory p1,
        G1Point memory p2
    ) internal view returns (G1Point memory r) {

        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-add-failed");
    }

    /*
     * @return The product of a point on G1 and a scalar, i.e.
     *         p == p.scalar_mul(1) and p.plus(p) == p.scalar_mul(2) for all
     *         points p.
     */
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {

        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }

    /* @return The result of computing the pairing check
     *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *         For example,
     *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
     */
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {

        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];

        uint256 inputSize = 24;
        uint256[] memory input = new uint256[](inputSize);

        for (uint256 i = 0; i < 4; i++) {
            uint256 j = i * 6;
            input[j + 0] = p1[i].X;
            input[j + 1] = p1[i].Y;
            input[j + 2] = p2[i].X[0];
            input[j + 3] = p2[i].X[1];
            input[j + 4] = p2[i].Y[0];
            input[j + 5] = p2[i].Y[1];
        }

        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-opcode-failed");

        return out[0] != 0;
    }
}

contract ReputationFromAttesterVerifier {

    using Pairing for *;

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alpha1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[13] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(uint256(12625141309497725138403111925285512317557867813200821932885008449973011259016),uint256(3283132092843888070960144184446714457028226149241964450481772355571490088931));
        vk.beta2 = Pairing.G2Point([uint256(11465157610904051866039694697520640224370142114773144069283456375942589334672),uint256(14730175357168610382981944845869127329905513753626348735696753093039650853045)], [uint256(3857007652958352492543809127140263541795357839226876731333457920873230023767),uint256(17225413466867089373692412933297471889809295935184555997684506869564610664171)]);
        vk.gamma2 = Pairing.G2Point([uint256(4964043111857657639740508526205928075797810807655893567931231120743918522967),uint256(16714157734574790558232513341461648596368941920986728409677251612733591573426)], [uint256(2241243497147263163448165980793017601054247232489046296883966647260322287876),uint256(4780303126463689896600310103825514549495974167502570497591109666114612589997)]);
        vk.delta2 = Pairing.G2Point([uint256(8316626959233022369073454275660069865475984329082876006111380468329928349573),uint256(1688270572316495362146566565253579339354147260973607988400323099028823987862)], [uint256(13674407722333793033318660427535685078785301712452494750325181575821034784924),uint256(9388388944191126889233842846303057372353587023772472403645889553545889078940)]);
        vk.IC[0] = Pairing.G1Point(uint256(16568820445827079162241131528352951777449323244563986120607783308778814858188),uint256(15713697667369718368495441824997398906982466534604767361428555890667850954371));
        vk.IC[1] = Pairing.G1Point(uint256(3302913778025904732258520495645129148755916467130625900524861316798500258347),uint256(6390250336816863854240511895475700456307336258638940716869423774724450731513));
        vk.IC[2] = Pairing.G1Point(uint256(6796740171540997864495027683602407917941534075251292054371862319127162956090),uint256(21175712400595490230163837634307703044437555997698311935591679006623311190155));
        vk.IC[3] = Pairing.G1Point(uint256(11071355512907684912871703430306069852813193178123607738000808358990802557136),uint256(9641597591889792713914368235381037346277710324445542613544288411863221511142));
        vk.IC[4] = Pairing.G1Point(uint256(14131071068762650492160073679538440074491525125671963784726789482664501487933),uint256(20912842969912560752909919551865928484886725653476153241140058175459645506805));
        vk.IC[5] = Pairing.G1Point(uint256(17793243478157981413643944159489529237442660137290077945797405668933489736850),uint256(5983035456324647989072647627169730454087381858526703796057467935589074808816));
        vk.IC[6] = Pairing.G1Point(uint256(10148252159030279749543071829976798490881961512733863894141379822643122535045),uint256(5842944997640638878970086719030243540277059478665377344361512701040634307430));
        vk.IC[7] = Pairing.G1Point(uint256(21004163804548798168089094088655164255978624061904884382312238902713183929758),uint256(2551097137620823748718462289296520568578181154881777140068274612728515348476));
        vk.IC[8] = Pairing.G1Point(uint256(19229027379101672343985843350692237818054153399682794911762833825463828326799),uint256(20581717747134618869194565990181803917338784289119350470581901146028476779819));
        vk.IC[9] = Pairing.G1Point(uint256(13551133795088202564864861089313159466835507322118637683680216958522967274043),uint256(16463964409045389843021782943386383217680018200075419026413546813815837404296));
        vk.IC[10] = Pairing.G1Point(uint256(15651290968209678715861955713492415935130829245011758109149962532366725872566),uint256(20967004042032257056942338353386470885726246278604632487969481788174932512105));
        vk.IC[11] = Pairing.G1Point(uint256(10948270991481359260281935881837973308574238049467564534297036526175798515808),uint256(14040124844472677732794293533172851526475312502145290872954091961366745407274));
        vk.IC[12] = Pairing.G1Point(uint256(9977540381434936728114916856299185809797699269764656992350105909706902038257),uint256(19984669048866200051373721182541388100691231750356330438204510023093768806797));

    }
    
    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) public view returns (bool) {

        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);

        VerifyingKey memory vk = verifyingKey();

        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);

        // Make sure that proof.A, B, and C are each less than the prime q
        require(proof.A.X < PRIME_Q, "verifier-aX-gte-prime-q");
        require(proof.A.Y < PRIME_Q, "verifier-aY-gte-prime-q");

        require(proof.B.X[0] < PRIME_Q, "verifier-bX0-gte-prime-q");
        require(proof.B.Y[0] < PRIME_Q, "verifier-bY0-gte-prime-q");

        require(proof.B.X[1] < PRIME_Q, "verifier-bX1-gte-prime-q");
        require(proof.B.Y[1] < PRIME_Q, "verifier-bY1-gte-prime-q");

        require(proof.C.X < PRIME_Q, "verifier-cX-gte-prime-q");
        require(proof.C.Y < PRIME_Q, "verifier-cY-gte-prime-q");

        // Make sure that every input is less than the snark scalar field
        //for (uint256 i = 0; i < input.length; i++) {
        for (uint256 i = 0; i < 12; i++) {
            require(input[i] < SNARK_SCALAR_FIELD,"verifier-gte-snark-scalar-field");
            vk_x = Pairing.plus(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }

        vk_x = Pairing.plus(vk_x, vk.IC[0]);

        return Pairing.pairing(
            Pairing.negate(proof.A),
            proof.B,
            vk.alpha1,
            vk.beta2,
            vk_x,
            vk.gamma2,
            proof.C,
            vk.delta2
        );
    }
}